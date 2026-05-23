/*---------------------------------------------------------------------------------------------
 *  Real Vibecode CLI — Models Command
 *
 *  List and discover LLM models from configured providers.
 *  Communicates with the Proxima/LLM provider via OpenAI-compatible API.
 *--------------------------------------------------------------------------------------------*/

use anyhow::{Context, Result};
use colored::Colorize;
use reqwest::Client;
use serde::{Deserialize, Serialize};

/// Model info returned by the /v1/models endpoint
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelInfo {
    pub id: String,
    #[serde(default)]
    pub object: String,
    #[serde(default)]
    pub owned_by: Option<String>,
    #[serde(default)]
    pub created: Option<i64>,
}

/// Response from /v1/models
#[derive(Deserialize, Debug)]
struct ModelsResponse {
    data: Vec<ModelInfo>,
}

/// Discovery result from the Proxima provider
#[derive(Serialize, Deserialize, Debug)]
struct DiscoveryResponse {
    models: Vec<DiscoveredModel>,
    #[serde(default)]
    provider: String,
    #[serde(default)]
    timestamp: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct DiscoveredModel {
    id: String,
    provider: String,
    #[serde(default)]
    capabilities: Vec<String>,
    #[serde(default)]
    context_length: Option<u64>,
    #[serde(default)]
    available: bool,
}

/// List available models from configured providers
pub async fn list(api_url: String, json: bool) -> Result<()> {
    let client = Client::new();
    let url = format!("{}/v1/models", api_url.trim_end_matches('/'));

    let response = client
        .get(&url)
        .send()
        .await
        .context(format!(
            "Failed to connect to API at {}. Is the Proxima server running?",
            api_url
        ))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        anyhow::bail!("API error ({}): {}", status, body);
    }

    let models: ModelsResponse = response
        .json()
        .await
        .context("Failed to parse models response")?;

    if models.data.is_empty() {
        eprintln!("{}", "No models available.".yellow());
        return Ok(());
    }

    if json {
        let output = serde_json::to_string_pretty(&models.data)?;
        println!("{}", output);
        return Ok(());
    }

    // Pretty-print model list
    eprintln!(
        "\n  {} Available Models (from {})\n",
        "◈".magenta().bold(),
        api_url.dimmed()
    );

    eprintln!(
        "  {:<40} {:<20} {}",
        "MODEL ID".bold(),
        "OWNER".bold(),
        "CREATED".bold()
    );
    eprintln!("  {}", "─".repeat(80).dimmed());

    for model in &models.data {
        let created = model
            .created
            .map(|ts| {
                chrono_from_epoch(ts)
                    .unwrap_or_else(|| ts.to_string())
            })
            .unwrap_or_else(|| "—".to_string());

        let owner = model
            .owned_by
            .as_deref()
            .unwrap_or("—");

        eprintln!(
            "  {:<40} {:<20} {}",
            model.id.cyan(),
            owner.dimmed(),
            created.dimmed()
        );
    }

    eprintln!();
    eprintln!("  {} model(s) available\n", models.data.len().to_string().green());

    Ok(())
}

/// Discover models from local providers
pub async fn discover(api_url: String, force: bool) -> Result<()> {
    let client = Client::new();

    // Try the Proxima discovery endpoint first
    let discover_url = format!("{}/v1/models/discover", api_url.trim_end_matches('/'));

    eprintln!(
        "  {} Discovering models from {}{}...\n",
        "◈".magenta().bold(),
        api_url.cyan(),
        if force { " (force refresh)" } else { "" }
    );

    let response = client
        .post(&discover_url)
        .query(&[("force", force)])
        .send()
        .await;

    match response {
        Ok(resp) if resp.status().is_success() => {
            let discovery: DiscoveryResponse = resp
                .json()
                .await
                .context("Failed to parse discovery response")?;

            print_discovered_models(&discovery);
        }
        Ok(resp) => {
            // Fallback: try listing from /v1/models
            let status = resp.status();
            eprintln!(
                "  {} Discovery endpoint not available ({}). Falling back to /v1/models...",
                "⚠".yellow(),
                status
            );

            fallback_list(&client, &api_url).await?;
        }
        Err(_) => {
            // Fallback: try listing from /v1/models
            eprintln!(
                "  {} Discovery endpoint not reachable. Falling back to /v1/models...",
                "⚠".yellow()
            );

            fallback_list(&client, &api_url).await?;
        }
    }

    Ok(())
}

/// Fallback: list models from /v1/models when discovery is unavailable
async fn fallback_list(client: &Client, api_url: &str) -> Result<()> {
    let url = format!("{}/v1/models", api_url.trim_end_matches('/'));

    let response = client
        .get(&url)
        .send()
        .await
        .context("Failed to connect to API")?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        anyhow::bail!("API error ({}): {}", status, body);
    }

    let models: ModelsResponse = response
        .json()
        .await
        .context("Failed to parse models response")?;

    if models.data.is_empty() {
        eprintln!("{}", "  No models found.".yellow());
        return Ok(());
    }

    eprintln!("  {} Models found:\n", "●".green());

    for model in &models.data {
        let owner = model.owned_by.as_deref().unwrap_or("unknown");
        eprintln!(
            "  {} {} ({})",
            "▸".green(),
            model.id.cyan(),
            owner.dimmed()
        );
    }

    eprintln!();
    Ok(())
}

/// Print discovered models with details
fn print_discovered_models(discovery: &DiscoveryResponse) {
    if discovery.models.is_empty() {
        eprintln!("{}", "  No models discovered.".yellow());
        return;
    }

    eprintln!(
        "  {} Provider: {}\n",
        "●".green(),
        discovery.provider.cyan()
    );

    for model in &discovery.models {
        let status = if model.available {
            "●".green().to_string()
        } else {
            "○".red().to_string()
        };

        let caps = if model.capabilities.is_empty() {
            String::new()
        } else {
            format!(" [{}]", model.capabilities.join(", "))
        };

        let ctx = model
            .context_length
            .map(|cl| format!(" ({}k ctx)", cl / 1024))
            .unwrap_or_default();

        eprintln!(
            "  {} {} — {}{}{}",
            status,
            model.id.cyan(),
            model.provider.dimmed(),
            caps.dimmed(),
            ctx.dimmed()
        );
    }

    eprintln!();
    eprintln!(
        "  {} model(s) discovered\n",
        discovery.models.len().to_string().green()
    );
}

/// Convert epoch timestamp to a human-readable date string
fn chrono_from_epoch(ts: i64) -> Option<String> {
    // Simple date formatting without depending on chrono
    // Approximate year from epoch seconds (no chrono dependency)
    let days = ts / 86400;
    let year = 1970 + days / 365;
    Some(format!("{}-approx", year))
}
