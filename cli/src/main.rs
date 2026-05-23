/*---------------------------------------------------------------------------------------------
 *  Real Vibecode CLI — Main Entry Point
 *
 *  Terminal-based AI coding assistant powered by Proxima/LLM providers.
 *  Supports interactive chat, one-shot task execution, and model management.
 *
 *  Usage:
 *    vibecode chat                    — Start interactive chat
 *    vibecode run "fix the bug"       — Execute a coding task
 *    vibecode models list             — List available models
 *    vibecode models discover         — Discover local models
 *    vibecode version                 — Show version info
 *--------------------------------------------------------------------------------------------*/

mod commands;
mod constants;

use anyhow::Result;
use clap::Parser;
use colored::Colorize;

use commands::Command;

/// Real Vibecode — AI-powered coding assistant for the terminal
#[derive(Parser, Debug)]
#[command(
    name = constants::APPLICATION_NAME,
    version,
    about = "AI-powered coding assistant for the terminal",
    long_about = format!(
        "{} v{}\n\n\
         An AI-powered coding assistant that connects to Proxima/LLM providers.\n\
         Start an interactive chat, run one-shot tasks, or manage your models.\n\n\
         Examples:\n  \
           {bin} chat                      Start interactive chat\n  \
           {bin} run \"refactor auth module\" Execute a coding task\n  \
           {bin} models list               List available models\n  \
           {bin} models discover           Discover local models",
        constants::PRODUCT_NAME_LONG,
        env!("CARGO_PKG_VERSION"),
        bin = constants::APPLICATION_NAME,
    ),
    arg_required_else_help = true,
    propagate_version = true,
)]
struct Cli {
    #[command(subcommand)]
    command: Option<Command>,

    /// Enable verbose logging
    #[arg(short, long, global = true)]
    verbose: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    // Set up logging
    if cli.verbose {
        eprintln!("{} Verbose mode enabled", "◈".dimmed());
    }

    // Dispatch to the appropriate command handler
    match cli.command {
        Some(cmd) => commands::dispatch(cmd).await?,
        None => {
            // No subcommand — show help
            println!(
                "\n  {} v{}",
                constants::PRODUCT_NAME_LONG.bold().white(),
                env!("CARGO_PKG_VERSION").dimmed()
            );
            println!();
            println!("  Use {} to see available commands.", "--help".cyan());
            println!();
        }
    }

    Ok(())
}

/// Print version information (used by the `version` subcommand)
pub fn print_version() {
    println!(
        "\n  {} v{}",
        constants::PRODUCT_NAME_LONG.bold().white(),
        env!("CARGO_PKG_VERSION").cyan()
    );
    println!();
    println!("  Binary:    {}", constants::APPLICATION_NAME);
    println!("  Data dir:  ~/{}", constants::DEFAULT_DATA_PARENT_DIR);
    println!(
        "  User-Agent: {}",
        constants::get_default_user_agent(env!("CARGO_PKG_VERSION"))
    );
    println!();
}
