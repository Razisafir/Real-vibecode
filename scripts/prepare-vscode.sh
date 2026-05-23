#!/usr/bin/env bash
# =============================================================================
# Real Vibecode — VS Code Source Preparation
# =============================================================================
# Downloads the VS Code OSS source at the matching version and applies
# VibeCode branding patches. This is the first step before compilation.
#
# Usage:
#   ./scripts/prepare-vscode.sh [--version VERSION] [--clean]
#
# Environment variables:
#   VSCODE_VERSION    - VS Code version to download (default: from package.json)
#   VSCODE_REPO       - VS Code repository URL (default: microsoft/vscode)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Parse arguments
CLEAN=false
VSCODE_VERSION=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --version)
            VSCODE_VERSION="$2"
            shift 2
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--version VERSION] [--clean]"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Determine VS Code version from our package.json
if [[ -z "${VSCODE_VERSION}" ]]; then
    VSCODE_VERSION="$(node -p "require('${PROJECT_ROOT}/package.json').version")"
    log_info "Using version from package.json: ${VSCODE_VERSION}"
fi

VSCODE_SOURCE_DIR="${PROJECT_ROOT}/vscode-source"

# Clean if requested
if [[ "${CLEAN}" == true ]] && [[ -d "${VSCODE_SOURCE_DIR}" ]]; then
    log_info "Cleaning existing VS Code source..."
    rm -rf "${VSCODE_SOURCE_DIR}"
    log_success "Removed ${VSCODE_SOURCE_DIR}"
fi

# Step 1: Clone VS Code source if not present
if [[ ! -d "${VSCODE_SOURCE_DIR}" ]]; then
    log_info "Cloning VS Code source at version ${VSCODE_VERSION}..."
    
    # Use shallow clone for speed - only the specific tag
    git clone --depth 1 --branch "${VSCODE_VERSION}" \
        https://github.com/microsoft/vscode.git \
        "${VSCODE_SOURCE_DIR}"
    
    log_success "VS Code source cloned at tag ${VSCODE_VERSION}"
else
    log_info "VS Code source already exists at ${VSCODE_SOURCE_DIR}"
    log_info "Checking out version ${VSCODE_VERSION}..."
    cd "${VSCODE_SOURCE_DIR}"
    git fetch origin tag "${VSCODE_VERSION}" --depth 1 || true
    git checkout "${VSCODE_VERSION}" 2>/dev/null || log_warn "Could not checkout ${VSCODE_VERSION}"
fi

cd "${VSCODE_SOURCE_DIR}"

# Step 2: Apply VibeCode branding patches
log_info "Applying VibeCode branding patches..."

# Override product.json with VibeCode branding
VIBECODE_PRODUCT_JSON="${PROJECT_ROOT}/product.json"
if [[ -f "${VIBECODE_PRODUCT_JSON}" ]]; then
    # Merge our product.json overrides into VS Code's product.json
    node -e "
const fs = require('fs');
const vscodeProduct = JSON.parse(fs.readFileSync('product.json', 'utf8'));
const vibecodeProduct = JSON.parse(fs.readFileSync('${VIBECODE_PRODUCT_JSON}', 'utf8'));

// Override branding fields
vscodeProduct.nameShort = vibecodeProduct.nameShort;
vscodeProduct.nameLong = vibecodeProduct.nameLong;
vscodeProduct.applicationName = vibecodeProduct.applicationName;
vscodeProduct.dataFolderName = vibecodeProduct.dataFolderName;
vscodeProduct.sharedDataFolderName = vibecodeProduct.sharedDataFolderName;
vscodeProduct.win32DirName = vibecodeProduct.win32DirName;
vscodeProduct.win32NameVersion = vibecodeProduct.win32NameVersion || vibecodeProduct.nameLong;
vscodeProduct.win32RegValueName = vibecodeProduct.win32RegValueName;
vscodeProduct.win32MutexName = vibecodeProduct.win32MutexName;
vscodeProduct.win32AppUserModelId = vibecodeProduct.win32AppUserModelId;
vscodeProduct.win32x64AppId = vibecodeProduct.win32x64AppId;
vscodeProduct.win32arm64AppId = vibecodeProduct.win32arm64AppId;
vscodeProduct.win32x64UserAppId = vibecodeProduct.win32x64UserAppId;
vscodeProduct.win32arm64UserAppId = vibecodeProduct.win32arm64UserAppId;
vscodeProduct.win32ShellNameShort = vibecodeProduct.win32ShellNameShort;
vscodeProduct.win32TunnelServiceMutex = vibecodeProduct.win32TunnelServiceMutex;
vscodeProduct.win32TunnelMutex = vibecodeProduct.win32TunnelMutex;
vscodeProduct.darwinBundleIdentifier = vibecodeProduct.darwinBundleIdentifier;
vscodeProduct.linuxIconName = vibecodeProduct.linuxIconName;
vscodeProduct.urlProtocol = vibecodeProduct.urlProtocol;
vscodeProduct.licenseName = vibecodeProduct.licenseName;
vscodeProduct.licenseUrl = vibecodeProduct.licenseUrl;
vscodeProduct.reportIssueUrl = vibecodeProduct.reportIssueUrl;
vscodeProduct.requestFeatureUrl = vibecodeProduct.requestFeatureUrl;
vscodeProduct.updateUrl = vibecodeProduct.updateUrl;
vscodeProduct.downloadUrl = vibecodeProduct.downloadUrl;
vscodeProduct.releaseNotesUrl = vibecodeProduct.releaseNotesUrl;
vscodeProduct.documentationUrl = vibecodeProduct.documentationUrl;
vscodeProduct.keyboardShortcutsUrlMac = vibecodeProduct.keyboardShortcutsUrlMac;
vscodeProduct.keyboardShortcutsUrlLinux = vibecodeProduct.keyboardShortcutsUrlLinux;
vscodeProduct.keyboardShortcutsUrlWin = vibecodeProduct.keyboardShortcutsUrlWin;
vscodeProduct.builtInExtensions = vibecodeProduct.builtInExtensions || [];
vscodeProduct.onboardingThemes = vibecodeProduct.onboardingThemes;
vscodeProduct.onboardingKeymaps = vibecodeProduct.onboardingKeymaps;

// Override extensions gallery to use Open VSX (not Microsoft's proprietary one)
if (vibecodeProduct.extensionsGallery) {
    vscodeProduct.extensionsGallery = vibecodeProduct.extensionsGallery;
}

// Remove Microsoft-specific telemetry and update endpoints
delete vscodeProduct.quality;
delete vscodeProduct.linkedToOldStorageFolder;

fs.writeFileSync('product.json', JSON.stringify(vscodeProduct, null, '\t'));
console.log('product.json patched successfully');
console.log('  nameShort:', vscodeProduct.nameShort);
console.log('  applicationName:', vscodeProduct.applicationName);
console.log('  win32DirName:', vscodeProduct.win32DirName);
"
    log_success "product.json patched with VibeCode branding"
fi

# Step 3: Disable Microsoft telemetry
log_info "Disabling Microsoft telemetry..."
# Patch the telemetry service to be no-op
if [[ -f "src/vs/platform/telemetry/common/telemetry.ts" ]]; then
    sed -i 's/defaultTelemetryEndpoint\s*=.*/defaultTelemetryEndpoint = "";/g' src/vs/platform/telemetry/common/telemetry.ts 2>/dev/null || true
    log_success "Telemetry endpoint disabled"
fi

# Step 4: Copy VibeCode theme extension
log_info "Installing VibeCode theme extension..."
VIBECODE_THEME_DIR="${PROJECT_ROOT}/extensions/vibecode-theme-2026"
if [[ -d "${VIBECODE_THEME_DIR}" ]]; then
    cp -r "${VIBECODE_THEME_DIR}" "${VSCODE_SOURCE_DIR}/extensions/vibecode-theme-2026"
    log_success "VibeCode theme extension installed"
fi

# Step 5: Copy VibeCode AI Execution services
log_info "Installing VibeCode AI Execution services..."
VIBECODE_AI_DIR="${PROJECT_ROOT}/src/vs/workbench/services/aiExecution"
if [[ -d "${VIBECODE_AI_DIR}" ]]; then
    mkdir -p "${VSCODE_SOURCE_DIR}/src/vs/workbench/services/aiExecution"
    cp -r "${VIBECODE_AI_DIR}"/* "${VSCODE_SOURCE_DIR}/src/vs/workbench/services/aiExecution/"
    log_success "AI Execution services installed"
fi

# Step 6: Copy VibeCode MCP services
log_info "Installing VibeCode MCP services..."
VIBECODE_MCP_DIR="${PROJECT_ROOT}/src/vs/platform/mcp"
if [[ -d "${VIBECODE_MCP_DIR}" ]]; then
    mkdir -p "${VSCODE_SOURCE_DIR}/src/vs/platform/mcp"
    cp -r "${VIBECODE_MCP_DIR}"/* "${VSCODE_SOURCE_DIR}/src/vs/platform/mcp/"
    log_success "MCP platform services installed"
fi

VIBECODE_MCP_CONTRIB="${PROJECT_ROOT}/src/vs/workbench/contrib/mcp"
if [[ -d "${VIBECODE_MCP_CONTRIB}" ]]; then
    mkdir -p "${VSCODE_SOURCE_DIR}/src/vs/workbench/contrib/mcp"
    cp -r "${VIBECODE_MCP_CONTRIB}"/* "${VSCODE_SOURCE_DIR}/src/vs/workbench/contrib/mcp/"
    log_success "MCP contributions installed"
fi

# Step 7: Copy VibeCode auth services
VIBECODE_AUTH_DIR="${PROJECT_ROOT}/src/vs/workbench/services/authentication"
if [[ -d "${VIBECODE_AUTH_DIR}" ]]; then
    mkdir -p "${VSCODE_SOURCE_DIR}/src/vs/workbench/services/authentication"
    cp -r "${VIBECODE_AUTH_DIR}"/* "${VSCODE_SOURCE_DIR}/src/vs/workbench/services/authentication/"
    log_success "Authentication services installed"
fi

# Step 8: Copy VibeCode product platform overrides
VIBECODE_PRODUCT_DIR="${PROJECT_ROOT}/src/vs/platform/product"
if [[ -d "${VIBECODE_PRODUCT_DIR}" ]]; then
    mkdir -p "${VSCODE_SOURCE_DIR}/src/vs/platform/product"
    cp -r "${VIBECODE_PRODUCT_DIR}"/* "${VSCODE_SOURCE_DIR}/src/vs/platform/product/"
    log_success "Product platform overrides installed"
fi

# Step 9: Copy VibeCode resources (icons, etc.)
log_info "Copying VibeCode resources..."
if [[ -f "${PROJECT_ROOT}/resources/win32/code.ico" ]]; then
    cp "${PROJECT_ROOT}/resources/win32/code.ico" "${VSCODE_SOURCE_DIR}/resources/win32/code.ico" 2>/dev/null || true
    log_success "Custom Windows icon copied"
fi
if [[ -f "${PROJECT_ROOT}/resources/darwin/code.icns" ]]; then
    cp "${PROJECT_ROOT}/resources/darwin/code.icns" "${VSCODE_SOURCE_DIR}/resources/darwin/code.icns" 2>/dev/null || true
    log_success "Custom macOS icon copied"
fi

# Copy Linux icons
if [[ -d "${PROJECT_ROOT}/resources/linux" ]]; then
    cp "${PROJECT_ROOT}/resources/linux/"code*.png "${VSCODE_SOURCE_DIR}/resources/linux/" 2>/dev/null || true
    cp "${PROJECT_ROOT}/resources/linux/"code*.svg "${VSCODE_SOURCE_DIR}/resources/linux/" 2>/dev/null || true
    log_success "Custom Linux icons copied"
fi
log_success "All resources copied"

# Step 10: Install dependencies
# VS Code uses .ts scripts in npm lifecycle hooks (preinstall, postinstall)
# that Node.js can't run directly. We use --ignore-scripts to bypass them,
# then run the actual build scripts during the compile step.
log_info "Installing VS Code dependencies..."
if command -v yarn &>/dev/null; then
    yarn install --ignore-scripts 2>&1 | tail -5
    log_success "Dependencies installed via yarn (scripts deferred to compile step)"
else
    npm install --ignore-scripts 2>&1 | tail -5
    log_success "Dependencies installed via npm (scripts deferred to compile step)"
fi

echo ""
log_success "VS Code source preparation complete!"
log_info "Source directory: ${VSCODE_SOURCE_DIR}"
log_info "Next step: Run scripts/build-desktop.sh to compile and package"
