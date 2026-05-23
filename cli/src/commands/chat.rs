/*---------------------------------------------------------------------------------------------
 *  Real Vibecode CLI — Chat Command
 *
 *  Interactive terminal-based AI chat session with streaming output.
 *  Connects to the Proxima/LLM provider via OpenAI-compatible API.
 *--------------------------------------------------------------------------------------------*/

use anyhow::Result;
use colored::Colorize;
use console::Term;
use futures::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};


use crate::constants;

/// OpenAI-compatible chat completion request
#[derive(Serialize, Debug)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    stream: bool,
}

/// A single message in the chat conversation
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// SSE streaming chunk from the API
#[derive(Deserialize, Debug)]
struct StreamDelta {
    content: Option<String>,
}

#[derive(Deserialize, Debug)]
struct StreamChoice {
    delta: StreamDelta,
    #[allow(dead_code)]
    finish_reason: Option<String>,
}

#[derive(Deserialize, Debug)]
struct StreamChunk {
    choices: Vec<StreamChoice>,
}

/// Run the interactive chat session
pub async fn run(model: String, system: Option<String>, api_url: String) -> Result<()> {
    let client = Client::new();
    let term = Term::stdout();

    // Print welcome banner
    print_banner(&term)?;

    // Build initial message history
    let mut messages: Vec<ChatMessage> = Vec::new();

    if let Some(sys_prompt) = system {
        messages.push(ChatMessage {
            role: "system".to_string(),
            content: sys_prompt,
        });
    } else {
        messages.push(ChatMessage {
            role: "system".to_string(),
            content: format!(
                "You are {}, an AI coding assistant running in the terminal. \
                 Help the user with coding tasks, answer questions, and generate code. \
                 Be concise and practical.",
                constants::PRODUCT_NAME_LONG
            ),
        });
    }

    // Resolve model alias
    let resolved_model = resolve_model(&client, &api_url, &model).await;

    term.write_line(&format!(
        "{}  Model: {}",
        "●".green(),
        resolved_model.cyan()
    ))?;
    term.write_line(&format!(
        "{}  API:   {}",
        "●".green(),
        api_url.dimmed()
    ))?;
    term.write_line(&format!(
        "{}  Type your message and press Enter. Type /quit to exit.\n",
        "●".dimmed()
    ))?;

    loop {
        // Read user input
        let input = match term.read_line_initial_text("") {
            Ok(line) => line,
            Err(_) => break, // EOF or terminal error
        };

        let trimmed = input.trim();
        if trimmed.is_empty() {
            continue;
        }

        // Handle slash commands
        if trimmed.starts_with('/') {
            match trimmed {
                "/quit" | "/exit" | "/q" => {
                    term.write_line(&format!("{} Goodbye!", "👋".to_string()))?;
                    break;
                }
                "/clear" => {
                    messages.truncate(1); // Keep system message
                    term.write_line(&format!("{} Conversation cleared.", "🗑".to_string()))?;
                    continue;
                }
                "/help" => {
                    term.write_line(&format!(
                        "\n  /quit, /exit  — Exit the chat\n  /clear        — Clear conversation history\n  /help         — Show this help\n"
                    ))?;
                    continue;
                }
                _ => {
                    term.write_line(
                        &format!("{} Unknown command: {}. Type /help for available commands.", "⚠".yellow(), trimmed)
                    )?;
                    continue;
                }
            }
        }

        // Add user message
        messages.push(ChatMessage {
            role: "user".to_string(),
            content: trimmed.to_string(),
        });

        // Send to API with streaming
        print_assistant_prefix(&term)?;

        let request = ChatRequest {
            model: resolved_model.clone(),
            messages: messages.clone(),
            stream: true,
        };

        let url = format!("{}/v1/chat/completions", api_url.trim_end_matches('/'));

        let response = match client
            .post(&url)
            .json(&request)
            .header("Accept", "text/event-stream")
            .send()
            .await
        {
            Ok(r) => r,
            Err(e) => {
                term.write_line(&format!(
                    "\n{} Failed to connect to API at {}: {}",
                    "✗".red(),
                    api_url,
                    e.to_string().red()
                ))?;
                term.write_line(&format!(
                    "{} Make sure the Proxima server is running on {}",
                    "ℹ".dimmed(),
                    api_url
                ))?;
                // Remove the failed user message
                messages.pop();
                continue;
            }
        };

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            term.write_line(&format!(
                "\n{} API error ({}): {}",
                "✗".red(),
                status,
                body.red()
            ))?;
            messages.pop();
            continue;
        }

        // Process SSE stream
        let mut full_response = String::new();
        let stream = response.bytes_stream();

        let mut buffer = String::new();
        let mut stream = Box::pin(stream);

        while let Some(chunk_result) = stream.next().await {
            let chunk = match chunk_result {
                Ok(c) => c,
                Err(e) => {
                    term.write_line(&format!("\n{} Stream error: {}", "✗".red(), e))?;
                    break;
                }
            };

            buffer.push_str(&String::from_utf8_lossy(&chunk));

            // Process complete SSE events from buffer
            while let Some(pos) = buffer.find("\n\n") {
                let event_str = buffer[..pos].to_string();
                buffer = buffer[pos + 2..].to_string();

                for line in event_str.lines() {
                    if let Some(data) = line.strip_prefix("data: ") {
                        let data = data.trim();
                        if data == "[DONE]" {
                            continue;
                        }

                        if let Ok(chunk) = serde_json::from_str::<StreamChunk>(data) {
                            for choice in &chunk.choices {
                                if let Some(content) = &choice.delta.content {
                                    term.write_str(content)?;
                                    full_response.push_str(content);
                                }
                            }
                        }
                    }
                }
            }
        }

        term.write_line("")?; // Newline after streaming output

        // Add assistant response to history
        if !full_response.is_empty() {
            messages.push(ChatMessage {
                role: "assistant".to_string(),
                content: full_response,
            });
        }
    }

    Ok(())
}

/// Resolve a model alias to the actual model ID
async fn resolve_model(client: &Client, api_url: &str, model: &str) -> String {
    if model != "default" {
        return model.to_string();
    }

    // Try to fetch the default model from the API
    let url = format!("{}/v1/models", api_url.trim_end_matches('/'));
    match client.get(&url).send().await {
        Ok(resp) if resp.status().is_success() => {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if let Some(models) = json["data"].as_array() {
                    if let Some(first) = models.first() {
                        if let Some(id) = first["id"].as_str() {
                            return id.to_string();
                        }
                    }
                }
            }
        }
        _ => {}
    }

    // Fallback default
    "gpt-4o".to_string()
}

/// Print the welcome banner
fn print_banner(term: &Term) -> Result<()> {
    let name = constants::PRODUCT_NAME_LONG;
    let version = env!("CARGO_PKG_VERSION");

    term.write_line(&format!(
        "\n  {} {} v{}\n",
        "◈".magenta().bold(),
        name.bold().white(),
        version.dimmed()
    ))?;
    Ok(())
}

/// Print the assistant prefix before a response
fn print_assistant_prefix(term: &Term) -> Result<()> {
    term.write_str(&format!("{} ", "◈".magenta().bold()))?;
    Ok(())
}
