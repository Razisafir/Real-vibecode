/*---------------------------------------------------------------------------------------------
 *  Real Vibecode CLI — Command Module Registry
 *
 *  Registers all available CLI subcommands and dispatches to their handlers.
 *--------------------------------------------------------------------------------------------*/

pub mod chat;
pub mod models;
pub mod run;

use anyhow::Result;
use clap::Subcommand;

/// All available CLI subcommands
#[derive(Subcommand, Debug)]
pub enum Command {
    /// Start an interactive AI chat session
    Chat {
        /// Model to use for chat (e.g. "gpt-4o", "claude-3-opus")
        #[arg(short, long, default_value = "default")]
        model: String,

        /// System prompt to prepend to the conversation
        #[arg(short, long)]
        system: Option<String>,

        /// Proxima/LLM provider base URL
        #[arg(long, env = "VIBECODE_API_URL", default_value = "http://localhost:3210")]
        api_url: String,
    },

    /// Execute a single AI coding task
    Run {
        /// The prompt describing the coding task
        prompt: String,

        /// Model to use for execution
        #[arg(short, long, default_value = "default")]
        model: String,

        /// Working directory for the task (defaults to current directory)
        #[arg(short, long)]
        workdir: Option<String>,

        /// Proxima/LLM provider base URL
        #[arg(long, env = "VIBECODE_API_URL", default_value = "http://localhost:3210")]
        api_url: String,

        /// Disable streaming output (wait for full response)
        #[arg(long)]
        no_stream: bool,
    },

    /// List and manage LLM models
    Models {
        #[command(subcommand)]
        action: ModelsAction,
    },

    /// Show version information
    Version,
}

/// Subcommands for the models command
#[derive(Subcommand, Debug)]
pub enum ModelsAction {
    /// List available models from configured providers
    List {
        /// Proxima/LLM provider base URL
        #[arg(long, env = "VIBECODE_API_URL", default_value = "http://localhost:3210")]
        api_url: String,

        /// Output as JSON
        #[arg(long)]
        json: bool,
    },

    /// Discover models from local providers
    Discover {
        /// Proxima/LLM provider base URL
        #[arg(long, env = "VIBECODE_API_URL", default_value = "http://localhost:3210")]
        api_url: String,

        /// Force re-discovery (ignore cache)
        #[arg(long)]
        force: bool,
    },
}

/// Dispatch a command to its handler
pub async fn dispatch(cmd: Command) -> Result<()> {
    match cmd {
        Command::Chat {
            model,
            system,
            api_url,
        } => chat::run(model, system, api_url).await,
        Command::Run {
            prompt,
            model,
            workdir,
            api_url,
            no_stream,
        } => run::run(prompt, model, workdir, api_url, !no_stream).await,
        Command::Models { action } => match action {
            ModelsAction::List { api_url, json } => models::list(api_url, json).await,
            ModelsAction::Discover { api_url, force } => models::discover(api_url, force).await,
        },
        Command::Version => {
            crate::print_version();
            Ok(())
        }
    }
}
