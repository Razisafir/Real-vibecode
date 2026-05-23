#!/usr/bin/env bash
# =============================================================================
# Real Vibecode — Desktop Build Script
# =============================================================================
# Orchestrates the full desktop packaging pipeline for Windows, macOS, and Linux.
# This script downloads the VS Code source, applies VibeCode branding,
# compiles, and packages with electron-builder.
#
# Usage:
#   ./scripts/build-desktop.sh                    # Build for current platform
#   ./scripts/build-desktop.sh --platform win      # Build for Windows (NSIS)
#   ./scripts/build-desktop.sh --platform mac      # Build for macOS (DMG)
#   ./scripts/build-desktop.sh --platform linux    # Build for Linux (AppImage/DEB/RPM)
#   ./scripts/build-desktop.sh --platform all      # Build for all platforms
#
# Flags:
#   --platform <win|mac|linux|all>   Target platform (default: auto-detect)
#   --arch <x64|arm64>               Target architecture (default: host arch)
#   --skip-prepare                   Skip VS Code source download/patch step
#   --skip-compile                   Skip the VS Code compilation step
#   --skip-sign                      Skip code signing (macOS/Windows)
#   --publish                        Publish artifacts after build
#   --clean                          Clean dist/ and vscode-source/ before building
#   --verbose                        Enable verbose output
#   -h, --help                       Show this help message
#
# Environment variables:
#   CSC_LINK            Path or URL to code-signing certificate (macOS/Windows)
#   CSC_KEY_PASSWORD    Password for the code-signing certificate
#   APPLE_ID            Apple ID for notarization
#   APPLE_ID_PASSWORD   App-specific password for notarization
#   APPLE_TEAM_ID       Apple Developer team ID
#   GH_TOKEN            GitHub token for publishing releases
#   ELECTRON_CACHE      Custom Electron binary cache directory
#   VSCODE_VERSION      Override VS Code version (default: from package.json)
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Script directory & project root
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ---------------------------------------------------------------------------
# Color output helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_step()    { echo -e "\n${CYAN}━━━ $* ━━━${NC}"; }

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
PLATFORM=""
ARCH=""
SKIP_PREPARE=false
SKIP_COMPILE=false
SKIP_SIGN=false
PUBLISH=false
CLEAN=false
VERBOSE=false

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
usage() {
    head -35 "$0" | tail -33 | sed 's/^# \?//'
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --platform)
            PLATFORM="$2"
            shift 2
            ;;
        --arch)
            ARCH="$2"
            shift 2
            ;;
        --skip-prepare)
            SKIP_PREPARE=true
            shift
            ;;
        --skip-compile)
            SKIP_COMPILE=true
            shift
            ;;
        --skip-sign)
            SKIP_SIGN=true
            shift
            ;;
        --publish)
            PUBLISH=true
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information."
            exit 1
            ;;
    esac
done

# ---------------------------------------------------------------------------
# Auto-detect platform if not specified
# ---------------------------------------------------------------------------
detect_platform() {
    local uname_out
    uname_out="$(uname -s)"
    case "${uname_out}" in
        Linux*)     echo "linux" ;;
        Darwin*)    echo "mac" ;;
        MINGW*|MSYS*|CYGWIN*) echo "win" ;;
        *)          log_error "Unsupported operating system: ${uname_out}"; exit 1 ;;
    esac
}

detect_arch() {
    local uname_m
    uname_m="$(uname -m)"
    case "${uname_m}" in
        x86_64|amd64)  echo "x64" ;;
        aarch64|arm64) echo "arm64" ;;
        *)             log_error "Unsupported architecture: ${uname_m}"; exit 1 ;;
    esac
}

if [[ -z "${PLATFORM}" ]]; then
    PLATFORM="$(detect_platform)"
    log_info "Auto-detected platform: ${PLATFORM}"
fi

if [[ -z "${ARCH}" ]]; then
    ARCH="$(detect_arch)"
    log_info "Auto-detected architecture: ${ARCH}"
fi

# Validate platform
case "${PLATFORM}" in
    win|mac|linux|all) ;;
    *)
        log_error "Invalid platform '${PLATFORM}'. Must be: win, mac, linux, or all"
        exit 1
        ;;
esac

# Validate architecture
case "${ARCH}" in
    x64|arm64) ;;
    *)
        log_error "Invalid architecture '${ARCH}'. Must be: x64 or arm64"
        exit 1
        ;;
esac

# ---------------------------------------------------------------------------
# Check required dependencies
# ---------------------------------------------------------------------------
check_dependencies() {
    log_step "Checking required dependencies"

    local missing=()

    # Node.js
    if command -v node &>/dev/null; then
        local node_version
        node_version="$(node --version)"
        log_success "Node.js ${node_version} found"

        local node_major
        node_major="$(echo "${node_version}" | sed 's/^v\([0-9]*\).*/\1/')"
        if [[ "${node_major}" -lt 18 ]]; then
            log_error "Node.js 18+ is required (found ${node_version})"
            missing+=("node>=18")
        fi
    else
        log_error "Node.js not found. Install from https://nodejs.org"
        missing+=("node")
    fi

    # npm
    if command -v npm &>/dev/null; then
        log_success "npm $(npm --version) found"
    else
        log_error "npm not found."
        missing+=("npm")
    fi

    # yarn (preferred for VS Code builds)
    if command -v yarn &>/dev/null; then
        log_success "yarn $(yarn --version) found"
    else
        log_warn "yarn not found — npm will be used (yarn is recommended for VS Code builds)"
    fi

    # git
    if command -v git &>/dev/null; then
        log_success "git $(git --version | cut -d' ' -f3) found"
    else
        log_error "git not found."
        missing+=("git")
    fi

    # Python (required by node-gyp for native modules)
    if command -v python3 &>/dev/null || command -v python &>/dev/null; then
        log_success "Python found"
    else
        log_warn "Python not found — native module builds may fail"
    fi

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing[*]}"
        exit 1
    fi

    log_success "All required dependencies are available"
}

# ---------------------------------------------------------------------------
# Clean output directories
# ---------------------------------------------------------------------------
clean_dist() {
    log_step "Cleaning output directories"
    
    local dist_dir="${PROJECT_ROOT}/dist"
    local vscode_dir="${PROJECT_ROOT}/vscode-source"
    
    if [[ -d "${dist_dir}" ]]; then
        rm -rf "${dist_dir}"
        log_success "Removed ${dist_dir}"
    fi
    
    if [[ "${CLEAN}" == true ]] && [[ -d "${vscode_dir}" ]]; then
        rm -rf "${vscode_dir}"
        log_success "Removed ${vscode_dir}"
    fi
}

# ---------------------------------------------------------------------------
# Prepare VS Code source with VibeCode branding
# ---------------------------------------------------------------------------
prepare_source() {
    if [[ "${SKIP_PREPARE}" == true ]]; then
        log_step "Skipping source preparation (--skip-prepare)"
        return
    fi

    log_step "Preparing VS Code source with VibeCode branding"
    
    local vscode_source="${PROJECT_ROOT}/vscode-source"
    
    if [[ -d "${vscode_source}" ]] && [[ -f "${vscode_source}/package.json" ]]; then
        log_info "VS Code source already exists — reusing (use --clean to rebuild from scratch)"
    else
        log_info "Running prepare-vscode.sh..."
        bash "${SCRIPT_DIR}/prepare-vscode.sh"
    fi
    
    log_success "Source preparation complete"
}

# ---------------------------------------------------------------------------
# Compile the VS Code source
# ---------------------------------------------------------------------------
compile_source() {
    if [[ "${SKIP_COMPILE}" == true ]]; then
        log_step "Skipping compilation (--skip-compile)"
        return
    fi

    log_step "Compiling VibeCode"

    local vscode_source="${PROJECT_ROOT}/vscode-source"
    
    if [[ ! -d "${vscode_source}" ]]; then
        log_error "VS Code source not found at ${vscode_source}"
        log_error "Run without --skip-prepare or run scripts/prepare-vscode.sh first"
        exit 1
    fi

    cd "${vscode_source}"

    # VS Code uses yarn for its build pipeline
    if command -v yarn &>/dev/null; then
        log_info "Compiling with yarn..."
        
        # Step 1: Run postinstall scripts (download Electron, etc.)
        log_info "Running postinstall scripts..."
        yarn postinstall 2>&1 | tail -10 || true
        
        # Step 2: Compile the core
        log_info "Running yarn compile..."
        if [[ "${VERBOSE}" == true ]]; then
            yarn compile
        else
            yarn compile 2>&1 | tail -20
        fi
        
        # Step 2: Build the electron app
        log_info "Running yarn electron..."
        yarn electron 2>&1 | tail -5 || true
    else
        log_info "Compiling with npm..."
        
        # Try npm scripts
        if npm run compile &>/dev/null 2>&1; then
            npm run compile 2>&1 | tail -20
        elif [[ -f "gulpfile.js" ]]; then
            npx gulp compile 2>&1 | tail -20
        else
            log_error "Cannot find compilation method. Install yarn: npm install -g yarn"
            exit 1
        fi
    fi

    # Verify compilation output
    if [[ -d "out" ]]; then
        log_success "Compilation complete — out/ directory created"
    else
        log_error "Compilation may have failed — out/ directory not found"
        exit 1
    fi
}

# ---------------------------------------------------------------------------
# Copy compiled output to project root for electron-builder
# ---------------------------------------------------------------------------
copy_build_output() {
    log_step "Copying build output for packaging"

    local vscode_source="${PROJECT_ROOT}/vscode-source"
    cd "${PROJECT_ROOT}"

    # Copy the compiled output from vscode-source to project root
    if [[ -d "${vscode_source}/out" ]]; then
        # Clean old output
        rm -rf "${PROJECT_ROOT}/out"
        
        # Copy compiled output
        cp -r "${vscode_source}/out" "${PROJECT_ROOT}/out"
        
        # Do NOT overwrite our product.json — the one in vscode-source was already
        # patched by prepare-vscode.sh, but to be safe we verify it has VibeCode branding.
        # If VS Code's compile step somehow reset product.json, we must keep our branded version.
        # Use relative path in a subshell to avoid MSYS path conversion issues on Windows.
        if (cd "${vscode_source}" && node -e "const p = require('./product.json'); process.exit(p.nameShort === 'VibeCode' ? 0 : 1)"); then
            cp "${vscode_source}/product.json" "${PROJECT_ROOT}/product.json"
            log_success "Verified product.json has VibeCode branding — copied"
        else
            log_warn "vscode-source/product.json lost VibeCode branding — keeping our version"
        fi
        
        # Copy node_modules needed at runtime
        if [[ -d "${vscode_source}/node_modules" ]]; then
            # Only copy if we don't have them already
            if [[ ! -d "${PROJECT_ROOT}/node_modules" ]]; then
                log_info "Copying node_modules..."
                cp -r "${vscode_source}/node_modules" "${PROJECT_ROOT}/node_modules"
            fi
        fi
        
        # Copy extensions
        if [[ -d "${vscode_source}/extensions" ]]; then
            rm -rf "${PROJECT_ROOT}/extensions_built" 2>/dev/null || true
            cp -r "${vscode_source}/extensions" "${PROJECT_ROOT}/extensions_built"
        fi
        
        log_success "Build output copied to project root"
    else
        log_error "No compiled output found at ${vscode_source}/out"
        exit 1
    fi
}

# ---------------------------------------------------------------------------
# Run electron-builder for the specified platform(s)
# ---------------------------------------------------------------------------
run_electron_builder() {
    local target_platform="$1"
    local publish_flag=""

    if [[ "${PUBLISH}" == true ]]; then
        publish_flag="--publish always"
    else
        publish_flag="--publish never"
    fi

    if [[ "${SKIP_SIGN}" == true ]]; then
        export CSC_IDENTITY_AUTO_DISCOVERY=false
        log_warn "Code signing disabled (--skip-sign)"
    fi

    cd "${PROJECT_ROOT}"

    case "${target_platform}" in
        win)
            log_step "Building Windows NSIS installer"
            npx electron-builder --win --"${ARCH}" ${publish_flag}
            ;;
        mac)
            log_step "Building macOS DMG"
            npx electron-builder --mac --"${ARCH}" ${publish_flag}
            ;;
        linux)
            log_step "Building Linux packages (AppImage + DEB + RPM)"
            npx electron-builder --linux --"${ARCH}" ${publish_flag}
            ;;
        all)
            log_step "Building all platforms"
            npx electron-builder --win --mac --linux --"${ARCH}" ${publish_flag}
            ;;
        *)
            log_error "Unknown platform: ${target_platform}"
            exit 1
            ;;
    esac
}

# ---------------------------------------------------------------------------
# Post-build: summarize artifacts
# ---------------------------------------------------------------------------
summarize_artifacts() {
    log_step "Build artifacts"

    local dist_dir="${PROJECT_ROOT}/dist"

    if [[ ! -d "${dist_dir}" ]]; then
        log_warn "No dist/ directory found — build may have failed"
        return
    fi

    local artifact_count=0
    local total_size=0

    echo ""
    while IFS= read -r -d '' file; do
        local filename
        filename="$(basename "${file}")"
        local size
        size="$(stat -f%z "${file}" 2>/dev/null || stat -c%s "${file}" 2>/dev/null || echo "0")"
        local size_mb
        size_mb="$(echo "scale=1; ${size} / 1048576" | bc 2>/dev/null || echo "?")"
        echo -e "  ${GREEN}▸${NC} ${filename}  (${size_mb} MB)"
        artifact_count=$((artifact_count + 1))
        total_size=$((total_size + size))
    done < <(find "${dist_dir}" -maxdepth 2 -type f \( -name "*.exe" -o -name "*.dmg" -o -name "*.zip" -o -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" -o -name "*.snap" -o -name "*.yml" -o -name "*.blockmap" \) -print0 2>/dev/null | sort -z)

    echo ""
    if [[ ${artifact_count} -gt 0 ]]; then
        local total_size_mb
        total_size_mb="$(echo "scale=1; ${total_size} / 1048576" | bc 2>/dev/null || echo "?")"
        log_success "${artifact_count} artifact(s) produced (${total_size_mb} MB total)"
        log_info "Output directory: ${dist_dir}"
    else
        log_warn "No build artifacts found in ${dist_dir}"
    fi
}

# ---------------------------------------------------------------------------
# Main execution
# ---------------------------------------------------------------------------
main() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║              VibeCode — Desktop Build                         ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log_info "Platform:      ${PLATFORM}"
    log_info "Architecture:  ${ARCH}"
    log_info "Project:       ${PROJECT_ROOT}"
    log_info "Skip prepare:  ${SKIP_PREPARE}"
    log_info "Skip compile:  ${SKIP_COMPILE}"
    log_info "Skip sign:     ${SKIP_SIGN}"
    log_info "Publish:       ${PUBLISH}"
    echo ""

    # Step 1: Check dependencies
    check_dependencies

    # Step 2: Clean if requested
    if [[ "${CLEAN}" == true ]]; then
        clean_dist
    fi

    # Step 3: Prepare VS Code source with VibeCode branding
    prepare_source

    # Step 4: Compile source
    compile_source

    # Step 5: Copy build output
    copy_build_output

    # Step 6: Build for target platform(s)
    if [[ "${PLATFORM}" == "all" ]]; then
        for p in win mac linux; do
            run_electron_builder "${p}"
        done
    else
        run_electron_builder "${PLATFORM}"
    fi

    # Step 7: Summarize output
    summarize_artifacts

    echo ""
    log_success "Build complete!"
    echo ""
}

# Run main
main
