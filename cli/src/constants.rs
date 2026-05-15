/*---------------------------------------------------------------------------------------------
 *  Real Vibecode CLI Constants
 *  Branding override for the Rust-based CLI.
 *
 *  These constants replace the VS Code CLI identity with Real Vibecode branding.
 *  They are used at compile time and embedded in the CLI binary.
 *--------------------------------------------------------------------------------------------*/

/// The application name used for binary naming and process identification
pub const APPLICATION_NAME: &str = "real-vibecode";

/// The full product name displayed in CLI help text and version output
pub const PRODUCT_NAME_LONG: &str = "Real Vibecode";

/// The quality-less product name (no "Insiders" or "OSS" suffix)
pub const QUALITYLESS_PRODUCT_NAME: &str = "Real Vibecode";

/// Default data parent directory (relative to $HOME)
pub const DEFAULT_DATA_PARENT_DIR: &str = ".real-vibecode";

/// Server data parent directory (relative to $HOME)
pub const SERVER_DATA_PARENT_DIR: &str = ".real-vibecode-server";

/// User agent string for HTTP requests from the CLI
pub fn get_default_user_agent(version: &str) -> String {
    format!("real-vibecode-launcher/{}", version)
}

/// CLI update endpoint — override via VSCODE_CLI_UPDATE_ENDPOINT env var
pub const CLI_UPDATE_ENDPOINT_ENV: &str = "REAL_VIBECODE_CLI_UPDATE_ENDPOINT";

/// Product download URL — override via environment variable
pub const PRODUCT_DOWNLOAD_URL_ENV: &str = "REAL_VIBECODE_DOWNLOAD_URL";
