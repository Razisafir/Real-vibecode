/*---------------------------------------------------------------------------------------------
 *  Real Vibecode CLI — Run Command
 *
 *  Execute a single AI coding task with streaming output.
 *  Designed for one-shot execution: pipe in a prompt, get code out.
 *--------------------------------------------------------------------------------------------*/

use anyhow::{Context, Result};
use colored::Colorize;
use futures::StreamExt;
use reqwest::Client;
use serde::Serialize;
use std::path::PathBuf;

use crate::constants;

/// OpenAI-compatible chat completion request
#[derive(Serialize, Debug)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    stream: bool,
    temperature: f32,
}

/// A single message in the conversation
#[derive(Serialize, Debug)]
struct ChatMessage {
    role: String,
    content: String,
}

/// SSE streaming delta
#[derive(serde::Deserialize, Debug)]
struct StreamDelta {
    content: Option<String>,
}

#[derive(serde::Deserialize, Debug)]
struct StreamChoice {
    delta: StreamDelta,
    #[allow(dead_code)]
    finish_reason: Option<String>,
}

#[derive(serde::Deserialize, Debug)]
struct StreamChunk {
    choices: Vec<StreamChoice>,
}

/// Non-streaming response
#[derive(serde::Deserialize, Debug)]
struct ChatResponse {
    choices: Vec<ResponseChoice>,
}

#[derive(serde::Deserialize, Debug)]
struct ResponseChoice {
    message: ResponseMessage,
}

#[derive(serde::Deserialize, Debug)]
struct ResponseMessage {
    content: String,
}

/// Run a single AI coding task
pub async fn run(
    prompt: String,
    model: String,
    workdir: Option<String>,
    api_url: String,
    stream: bool,
) -> Result<()> {
    let client = Client::new();

    // Validate working directory
    let cwd = match &workdir {
        Some(dir) => PathBuf::from(dir),
        None => std::env::current_dir().context("Failed to get current directory")?,
    };

    if !cwd.exists() {
        anyhow::bail!("Working directory does not exist: {}", cwd.display());
    }

    // Resolve model
    let resolved_model = resolve_model(&client, &api_url, &model).await;

    // Build the system prompt for coding tasks
    let system_prompt = format!(
        "You are {}, an AI coding assistant executing a coding task. \
         You are working in the directory: {}\n\n\
         When writing code:\n\
         - Produce clean, well-structured code\n\
         - Include necessary imports and dependencies\n\
         - Follow existing project conventions\n\
         - Be precise and correct\n\n\
         When describing changes:\n\
         - Be specific about file paths and line numbers\n\
         - Show diffs when modifying existing files\n\
         - Explain your reasoning concisely",
        constants::PRODUCT_NAME_LONG,
        cwd.display()
    );

    // Print task info
    eprintln!(
        "  {} Running task with model {}",
        "◈".magenta().bold(),
        resolved_model.cyan()
    );
    eprintln!(
        "  {} Working directory: {}",
        "●".dimmed(),
        cwd.display().to_string().dimmed()
    );
    eprintln!();

    let messages = vec![
        ChatMessage {
            role: "system".to_string(),
            content: system_prompt,
        },
        ChatMessage {
            role: "user".to_string(),
            content: prompt,
        },
    ];

    let request = ChatRequest {
        model: resolved_model.clone(),
        messages,
        stream,
        temperature: 0.2, // Low temperature for precise coding tasks
    };

    let url = format!("{}/v1/chat/completions", api_url.trim_end_matches('/'));

    let response = client
        .post(&url)
        .json(&request)
        .header("Accept", if stream { "text/event-stream" } else { "application/json" })
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

    if stream {
        stream_response(response).await?;
    } else {
        full_response(response).await?;
    }

    Ok(())
}

/// Process a streaming SSE response
async fn stream_response(response: reqwest::Response) -> Result<()> {
    let mut full_response = String::new();
    let mut buffer = String::new();
    let stream = response.bytes_stream();
    let mut stream = Box::pin(stream);

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.context("Stream read error")?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

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
                                print!("{}", content);
                                full_response.push_str(content);
                            }
                        }
                    }
                }
            }
        }
    }

    println!(); // Final newline
    Ok(())
}

/// Process a full (non-streaming) response
async fn full_response(response: reqwest::Response) -> Result<()> {
    let chat_resp: ChatResponse = response.json().await.context("Failed to parse API response")?;

    if let Some(choice) = chat_resp.choices.first() {
        println!("{}", choice.message.content);
    } else {
        eprintln!("{}", "No response from model.".yellow());
    }

    Ok(())
}

/// Resolve model alias to actual model ID
async fn resolve_model(client: &Client, api_url: &str, model: &str) -> String {
    if model != "default" {
        return model.to_string();
    }

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

    "gpt-4o".to_string()
}
