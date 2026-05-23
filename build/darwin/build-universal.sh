#!/usr/bin/env bash
# =============================================================================
# Real Vibecode — Build Universal macOS Binary
# =============================================================================
# Builds a universal (x64 + arm64) macOS binary using Apple's `lipo` tool,
# then signs, notarizes, and packages it as a DMG.
#
# Usage:
#   ./build/darwin/build-universal.sh [options]
#
# Options:
#   --skip-sign         Skip code signing and notarization
#   --skip-notarize     Skip notarization (sign only)
#   --skip-dmg          Skip DMG creation (universal .app only)
#   --clean             Clean intermediate builds before starting
#   --verbose           Enable verbose output
#   -h, --help          Show this help message
#
# Environment variables:
#   CSC_LINK            Base64-encoded .p12 certificate (or file path)
#   CSC_KEY_PASSWORD    Certificate password
#   APPLE_ID            Apple ID email for notarization
#   APPLE_ID_PASSWORD   App-specific password for notarization
#   APPLE_TEAM_ID       Apple Developer team ID
#   NOTARIZE_TIMEOUT    Notarization timeout in minutes (default: 30)
#
# Prerequisites:
#   - macOS with Xcode Command Line Tools installed
#   - Node.js 18+ and npm
#   - Valid Apple Developer ID Application certificate in Keychain
#   - For notarization: Apple ID + app-specific password + team ID
#
# Architecture:
#   1. Build x64 .app → dist/mac/Real Vibecode.app
#   2. Build arm64 .app → dist/mac-arm64/Real Vibecode.app
#   3. Merge with lipo → dist/mac-universal/Real Vibecode.app
#   4. Sign the universal .app with codesign
#   5. Notarize with notarytool
#   6. Create DMG from the universal .app
#
# Reference:
#   https://developer.apple.com/documentation/apple-silicon/building-a-universal-macos-binary
#   https://kilianvalkhof.com/2019/electron/packaging-an-electron-app-for-distribution-through-the-mac-app-store/
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Script directory & project root
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

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
SKIP_SIGN=false
SKIP_NOTARIZE=false
SKIP_DMG=false
CLEAN=false
VERBOSE=false
NOTARIZE_TIMEOUT="${NOTARIZE_TIMEOUT:-30}"

# App metadata
APP_NAME="Real Vibecode"
APP_EXECUTABLE="real-vibecode"
BUNDLE_ID="com.realvibecode.ide"
ENTITLEMENTS="${PROJECT_ROOT}/build/darwin/entitlements.mac.plist"

# Build directories
DIST_DIR="${PROJECT_ROOT}/dist"
BUILD_X64="${DIST_DIR}/mac"
BUILD_ARM64="${DIST_DIR}/mac-arm64"
BUILD_UNIVERSAL="${DIST_DIR}/mac-universal"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
usage() {
    sed -n '2,/^# =====/p' "$0" | sed 's/^# \?//'
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-sign)     SKIP_SIGN=true; shift ;;
        --skip-notarize) SKIP_NOTARIZE=true; shift ;;
        --skip-dmg)      SKIP_DMG=true; shift ;;
        --clean)         CLEAN=true; shift ;;
        --verbose)       VERBOSE=true; shift ;;
        -h|--help)       usage ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information."
            exit 1
            ;;
    esac
done

# ---------------------------------------------------------------------------
# Validate environment
# ---------------------------------------------------------------------------
validate_environment() {
    log_step "Validating build environment"

    # Must be on macOS
    if [[ "$(uname -s)" != "Darwin" ]]; then
        log_error "This script must be run on macOS."
        log_error "Universal binary creation requires macOS tools (lipo, codesign, notarytool)."
        exit 1
    fi

    # Check for Xcode command line tools
    if ! xcode-select -p &>/dev/null; then
        log_error "Xcode Command Line Tools not found."
        log_error "Install with: xcode-select --install"
        exit 1
    fi
    log_success "Xcode Command Line Tools found"

    # Check for lipo
    if ! command -v lipo &>/dev/null; then
        log_error "lipo tool not found. Install Xcode Command Line Tools."
        exit 1
    fi
    log_success "lipo tool available"

    # Check for Node.js
    if ! command -v node &>/dev/null; then
        log_error "Node.js not found. Install from https://nodejs.org"
        exit 1
    fi
    log_success "Node.js $(node --version) found"

    # Check for npm
    if ! command -v npm &>/dev/null; then
        log_error "npm not found."
        exit 1
    fi
    log_success "npm $(npm --version) found"

    # Check for electron-builder
    if ! npx electron-builder --version &>/dev/null; then
        log_error "electron-builder not found. Run: npm install"
        exit 1
    fi
    log_success "electron-builder available"

    # Check entitlements file
    if [[ ! -f "${ENTITLEMENTS}" ]]; then
        log_error "Entitlements file not found: ${ENTITLEMENTS}"
        exit 1
    fi
    log_success "Entitlements file found: ${ENTITLEMENTS}"

    # Check signing credentials
    if [[ "${SKIP_SIGN}" == false ]]; then
        if [[ -z "${CSC_LINK:-}" ]] && [[ -z "${CSC_KEY_PASSWORD:-}" ]]; then
            # Check if certificate is in Keychain
            if security find-identity -v -p codesigning | grep -q "Developer ID Application"; then
                log_success "Developer ID Application certificate found in Keychain"
            else
                log_warn "No signing certificate found."
                log_warn "Set CSC_LINK and CSC_KEY_PASSWORD, or install certificate in Keychain."
                log_warn "Continuing without signing (--skip-sign recommended if testing)."
            fi
        else
            log_success "CSC_LINK environment variable set"
        fi
    fi

    # Check notarization credentials
    if [[ "${SKIP_NOTARIZE}" == false ]] && [[ "${SKIP_SIGN}" == false ]]; then
        if [[ -z "${APPLE_ID:-}" ]] || [[ -z "${APPLE_ID_PASSWORD:-}" ]] || [[ -z "${APPLE_TEAM_ID:-}" ]]; then
            log_warn "Notarization credentials not fully configured."
            log_warn "Set APPLE_ID, APPLE_ID_PASSWORD, and APPLE_TEAM_ID."
            log_warn "Continuing without notarization."
            SKIP_NOTARIZE=true
        else
            log_success "Notarization credentials configured"
        fi
    fi
}

# ---------------------------------------------------------------------------
# Clean previous builds
# ---------------------------------------------------------------------------
clean_builds() {
    if [[ "${CLEAN}" == true ]]; then
        log_step "Cleaning previous builds"
        rm -rf "${BUILD_X64}" "${BUILD_ARM64}" "${BUILD_UNIVERSAL}"
        log_success "Cleaned build directories"
    fi
}

# ---------------------------------------------------------------------------
# Step 1: Build x64 binary
# ---------------------------------------------------------------------------
build_x64() {
    log_step "Building x64 (Intel) binary"

    cd "${PROJECT_ROOT}"

    # Disable auto-discovery to prevent signing individual arch builds
    # We'll sign the universal binary later
    local sign_env=""
    if [[ "${SKIP_SIGN}" == true ]]; then
        sign_env="CSC_IDENTITY_AUTO_DISCOVERY=false"
    fi

    eval "${sign_env}" npx electron-builder --mac --x64 \
        --publish never \
        --config.mac.target=dir

    # Verify x64 build
    local x64_app="${BUILD_X64}/${APP_NAME}.app"
    if [[ -d "${x64_app}" ]]; then
        local x64_arch
        x64_arch="$(lipo -archs "${x64_app}/Contents/MacOS/${APP_NAME}" 2>/dev/null || echo "unknown")"
        log_success "x64 build created: ${x64_app} (arch: ${x64_arch})"
    else
        log_error "x64 build failed — ${x64_app} not found"
        exit 1
    fi
}

# ---------------------------------------------------------------------------
# Step 2: Build arm64 binary
# ---------------------------------------------------------------------------
build_arm64() {
    log_step "Building arm64 (Apple Silicon) binary"

    cd "${PROJECT_ROOT}"

    local sign_env=""
    if [[ "${SKIP_SIGN}" == true ]]; then
        sign_env="CSC_IDENTITY_AUTO_DISCOVERY=false"
    fi

    eval "${sign_env}" npx electron-builder --mac --arm64 \
        --publish never \
        --config.mac.target=dir

    # Verify arm64 build
    local arm64_app="${BUILD_ARM64}/${APP_NAME}.app"
    if [[ -d "${arm64_app}" ]]; then
        local arm64_arch
        arm64_arch="$(lipo -archs "${arm64_app}/Contents/MacOS/${APP_NAME}" 2>/dev/null || echo "unknown")"
        log_success "arm64 build created: ${arm64_app} (arch: ${arm64_arch})"
    else
        log_error "arm64 build failed — ${arm64_app} not found"
        exit 1
    fi
}

# ---------------------------------------------------------------------------
# Step 3: Create universal binary with lipo
# ---------------------------------------------------------------------------
create_universal() {
    log_step "Creating universal binary with lipo"

    local x64_app="${BUILD_X64}/${APP_NAME}.app"
    local arm64_app="${BUILD_ARM64}/${APP_NAME}.app"

    # Validate both builds exist
    if [[ ! -d "${x64_app}" ]]; then
        log_error "x64 app not found: ${x64_app}"
        exit 1
    fi
    if [[ ! -d "${arm64_app}" ]]; then
        log_error "arm64 app not found: ${arm64_app}"
        exit 1
    fi

    # Create universal output directory
    mkdir -p "${BUILD_UNIVERSAL}"

    # Copy x64 app as the base for universal
    log_info "Using x64 build as base for universal app..."
    cp -R "${x64_app}" "${BUILD_UNIVERSAL}/${APP_NAME}.app"

    local universal_app="${BUILD_UNIVERSAL}/${APP_NAME}.app"
    local main_executable="${universal_app}/Contents/MacOS/${APP_NAME}"

    # ---------------------------------------------------------------------------
    # Merge the main executable with lipo
    # ---------------------------------------------------------------------------
    log_info "Merging main executable..."
    lipo -create \
        "${x64_app}/Contents/MacOS/${APP_NAME}" \
        "${arm64_app}/Contents/MacOS/${APP_NAME}" \
        -output "${main_executable}"

    # Verify the merged executable
    local merged_archs
    merged_archs="$(lipo -archs "${main_executable}")"
    log_success "Main executable merged: ${merged_archs}"

    # ---------------------------------------------------------------------------
    # Merge all .dylib (dynamic library) files
    # ---------------------------------------------------------------------------
    log_info "Merging dynamic libraries..."
    local dylib_count=0

    # Find all dylibs in x64 app and check if corresponding arm64 version exists
    while IFS= read -r -d '' x64_dylib; do
        local relative_path="${x64_dylib#${x64_app}/}"
        local arm64_dylib="${arm64_app}/${relative_path}"
        local universal_dylib="${universal_app}/${relative_path}"

        if [[ -f "${arm64_dylib}" ]]; then
            # Both architectures exist — merge with lipo
            lipo -create "${x64_dylib}" "${arm64_dylib}" -output "${universal_dylib}"
            dylib_count=$((dylib_count + 1))

            if [[ "${VERBOSE}" == true ]]; then
                log_info "  Merged: ${relative_path}"
            fi
        else
            # Only x64 exists — keep it (might be Intel-only native module)
            log_warn "  x64-only dylib: ${relative_path}"
        fi
    done < <(find "${x64_app}" -name "*.dylib" -type f -print0 2>/dev/null)

    # Also check arm64-only dylibs
    while IFS= read -r -d '' arm64_dylib; do
        local relative_path="${arm64_dylib#${arm64_app}/}"
        local x64_dylib="${x64_app}/${relative_path}"
        local universal_dylib="${universal_app}/${relative_path}"

        if [[ ! -f "${x64_dylib}" ]] && [[ ! -f "${universal_dylib}" ]]; then
            # arm64-only — copy it
            mkdir -p "$(dirname "${universal_dylib}")"
            cp "${arm64_dylib}" "${universal_dylib}"
            log_warn "  arm64-only dylib: ${relative_path}"
        fi
    done < <(find "${arm64_app}" -name "*.dylib" -type f -print0 2>/dev/null)

    log_success "Merged ${dylib_count} dynamic libraries"

    # ---------------------------------------------------------------------------
    # Merge all .node (native Node.js addon) files
    # ---------------------------------------------------------------------------
    log_info "Merging native Node.js addons (.node files)..."
    local node_count=0

    while IFS= read -r -d '' x64_node; do
        local relative_path="${x64_node#${x64_app}/}"
        local arm64_node="${arm64_app}/${relative_path}"
        local universal_node="${universal_app}/${relative_path}"

        if [[ -f "${arm64_node}" ]]; then
            lipo -create "${x64_node}" "${arm64_node}" -output "${universal_node}"
            node_count=$((node_count + 1))

            if [[ "${VERBOSE}" == true ]]; then
                log_info "  Merged: ${relative_path}"
            fi
        else
            log_warn "  x64-only addon: ${relative_path}"
        fi
    done < <(find "${x64_app}" -name "*.node" -type f -print0 2>/dev/null)

    # Check arm64-only .node files
    while IFS= read -r -d '' arm64_node; do
        local relative_path="${arm64_node#${arm64_app}/}"
        local x64_node="${x64_app}/${relative_path}"
        local universal_node="${universal_app}/${relative_path}"

        if [[ ! -f "${x64_node}" ]] && [[ ! -f "${universal_node}" ]]; then
            mkdir -p "$(dirname "${universal_node}")"
            cp "${arm64_node}" "${universal_node}"
            log_warn "  arm64-only addon: ${relative_path}"
        fi
    done < <(find "${arm64_app}" -name "*.node" -type f -print0 2>/dev/null)

    log_success "Merged ${node_count} native addons"

    # ---------------------------------------------------------------------------
    # Merge Electron Framework and other frameworks
    # ---------------------------------------------------------------------------
    log_info "Merging frameworks..."
    local framework_count=0

    for framework_dir in "${x64_app}"/Contents/Frameworks/*.framework; do
        if [[ ! -d "${framework_dir}" ]]; then
            continue
        fi

        local framework_name
        framework_name="$(basename "${framework_dir}")"
        local arm64_framework="${arm64_app}/Contents/Frameworks/${framework_name}"
        local universal_framework="${universal_app}/Contents/Frameworks/${framework_name}"

        if [[ -d "${arm64_framework}" ]]; then
            # Merge the framework binary
            local x64_fw_binary="${framework_dir}/${framework_name%.framework}"
            local arm64_fw_binary="${arm64_framework}/${framework_name%.framework}"
            local universal_fw_binary="${universal_framework}/${framework_name%.framework}"

            if [[ -f "${x64_fw_binary}" ]] && [[ -f "${arm64_fw_binary}" ]]; then
                lipo -create "${x64_fw_binary}" "${arm64_fw_binary}" -output "${universal_fw_binary}"
                framework_count=$((framework_count + 1))

                if [[ "${VERBOSE}" == true ]]; then
                    log_info "  Merged framework: ${framework_name}"
                fi
            fi
        fi
    done

    # Merge helper apps (e.g., Electron Helper.app)
    log_info "Merging helper applications..."
    while IFS= read -r -d '' x64_helper; do
        local helper_name
        helper_name="$(basename "${x64_helper}")"
        local arm64_helper="${arm64_app}/Contents/Frameworks/${helper_name}"
        local universal_helper="${universal_app}/Contents/Frameworks/${helper_name}"

        if [[ -d "${arm64_helper}" ]]; then
            local x64_helper_exec="${x64_helper}/Contents/MacOS/${helper_name%.app}"
            local arm64_helper_exec="${arm64_helper}/Contents/MacOS/${helper_name%.app}"
            local universal_helper_exec="${universal_helper}/Contents/MacOS/${helper_name%.app}"

            if [[ -f "${x64_helper_exec}" ]] && [[ -f "${arm64_helper_exec}" ]]; then
                lipo -create "${x64_helper_exec}" "${arm64_helper_exec}" -output "${universal_helper_exec}"
                framework_count=$((framework_count + 1))

                if [[ "${VERBOSE}" == true ]]; then
                    log_info "  Merged helper: ${helper_name}"
                fi
            fi
        fi
    done < <(find "${x64_app}/Contents/Frameworks" -name "*.app" -type d -maxdepth 1 -print0 2>/dev/null)

    log_success "Merged ${framework_count} frameworks and helpers"

    # ---------------------------------------------------------------------------
    # Verify universal binary
    # ---------------------------------------------------------------------------
    log_info "Verifying universal binary..."
    local universal_archs
    universal_archs="$(lipo -archs "${main_executable}")"
    if [[ "${universal_archs}" == *"x86_64"* ]] && [[ "${universal_archs}" == *"arm64"* ]]; then
        log_success "Universal binary verified: ${universal_archs}"
    else
        log_error "Universal binary verification failed: ${universal_archs}"
        log_error "Expected both x86_64 and arm64 architectures"
        exit 1
    fi

    # Print size info
    local universal_size
    universal_size="$(du -sh "${universal_app}" | cut -f1)"
    log_info "Universal app size: ${universal_size}"
}

# ---------------------------------------------------------------------------
# Step 4: Code sign the universal binary
# ---------------------------------------------------------------------------
sign_universal() {
    if [[ "${SKIP_SIGN}" == true ]]; then
        log_step "Skipping code signing (--skip-sign)"
        return
    fi

    log_step "Signing universal binary"

    local universal_app="${BUILD_UNIVERSAL}/${APP_NAME}.app"

    if [[ ! -d "${universal_app}" ]]; then
        log_error "Universal app not found: ${universal_app}"
        exit 1
    fi

    # Determine signing identity
    local signing_identity
    if [[ -n "${APPLE_TEAM_ID:-}" ]]; then
        signing_identity="Developer ID Application: ${APP_NAME} Project (${APPLE_TEAM_ID})"
    else
        # Try to find Developer ID certificate in Keychain
        signing_identity="$(security find-identity -v -p codesigning 2>/dev/null \
            | grep "Developer ID Application" | head -1 \
            | sed 's/.*"\(.*\)".*/\1/' || true)"

        if [[ -z "${signing_identity}" ]]; then
            log_error "No Developer ID Application certificate found for signing."
            log_error "Install certificate in Keychain or set CSC_LINK/CSC_KEY_PASSWORD."
            log_error "Use --skip-sign to skip signing."
            exit 1
        fi
    fi

    log_info "Signing identity: ${signing_identity}"

    # Remove any existing extended attributes (quarantine, etc.)
    xattr -cr "${universal_app}"

    # Sign all code elements from inside out
    # 1. Sign helper apps first (innermost)
    log_info "Signing helper applications..."
    while IFS= read -r -d '' helper; do
        codesign --force --options runtime \
            --entitlements "${ENTITLEMENTS}" \
            --sign "${signing_identity}" \
            --timestamp \
            "${helper}" 2>/dev/null || true
    done < <(find "${universal_app}/Contents/Frameworks" -name "*.app" -type d -print0 2>/dev/null | sort -zr)

    # 2. Sign all dylibs and .node files
    log_info "Signing dynamic libraries and native addons..."
    while IFS= read -r -d '' lib; do
        codesign --force --options runtime \
            --sign "${signing_identity}" \
            --timestamp \
            "${lib}" 2>/dev/null || true
    done < <(find "${universal_app}" \( -name "*.dylib" -o -name "*.node" \) -type f -print0 2>/dev/null)

    # 3. Sign framework binaries
    log_info "Signing frameworks..."
    for framework_dir in "${universal_app}"/Contents/Frameworks/*.framework; do
        if [[ -d "${framework_dir}" ]]; then
            local fw_name
            fw_name="$(basename "${framework_dir}")"
            codesign --force --options runtime \
                --sign "${signing_identity}" \
                --timestamp \
                "${framework_dir}/${fw_name%.framework}" 2>/dev/null || true
        fi
    done

    # 4. Sign the main app bundle (outermost — must be signed last)
    log_info "Signing main application bundle..."
    codesign --force --deep --options runtime \
        --entitlements "${ENTITLEMENTS}" \
        --sign "${signing_identity}" \
        --timestamp \
        "${universal_app}"

    # Verify signature
    log_info "Verifying code signature..."
    if codesign --verify --deep --strict --verbose=2 "${universal_app}" 2>&1; then
        log_success "Code signature verified"
    else
        log_error "Code signature verification failed"
        exit 1
    fi

    # Check Gatekeeper assessment
    if spctl --assess --type execute --verbose=2 "${universal_app}" 2>&1; then
        log_success "Gatekeeper assessment passed"
    else
        log_warn "Gatekeeper assessment failed (this may be expected for Development builds)"
    fi
}

# ---------------------------------------------------------------------------
# Step 5: Notarize the universal binary
# ---------------------------------------------------------------------------
notarize_universal() {
    if [[ "${SKIP_NOTARIZE}" == true ]] || [[ "${SKIP_SIGN}" == true ]]; then
        log_step "Skipping notarization"
        return
    fi

    log_step "Notarizing universal binary"

    local universal_app="${BUILD_UNIVERSAL}/${APP_NAME}.app"

    # Check notarization credentials
    if [[ -z "${APPLE_ID:-}" ]] || [[ -z "${APPLE_ID_PASSWORD:-}" ]] || [[ -z "${APPLE_TEAM_ID:-}" ]]; then
        log_warn "Notarization credentials not configured."
        log_warn "Set APPLE_ID, APPLE_ID_PASSWORD, and APPLE_TEAM_ID."
        log_warn "Skipping notarization."
        return
    fi

    # Create a temporary ZIP for notarization (notarytool requires .zip or .dmg)
    local notarization_zip="${BUILD_UNIVERSAL}/${APP_NAME}-notarization.zip"
    log_info "Creating notarization archive..."
    ditto -c -k --keepParent "${universal_app}" "${notarization_zip}"

    # Submit for notarization
    log_info "Submitting for notarization (timeout: ${NOTARIZE_TIMEOUT}m)..."
    local notarize_output
    notarize_output="$(xcrun notarytool submit "${notarization_zip}" \
        --apple-id "${APPLE_ID}" \
        --password "${APPLE_ID_PASSWORD}" \
        --team-id "${APPLE_TEAM_ID}" \
        --wait \
        --timeout "${NOTARIZE_TIMEOUT}m" 2>&1 || true)"

    echo "${notarize_output}"

    # Check notarization result
    if echo "${notarize_output}" | grep -q "status: Accepted"; then
        log_success "Notarization accepted"
    else
        log_error "Notarization failed or rejected"
        # Get the submission ID and log
        local submission_id
        submission_id="$(echo "${notarize_output}" | grep 'id:' | head -1 | awk '{print $2}' || echo "unknown")"
        if [[ "${submission_id}" != "unknown" ]]; then
            log_error "Check notarization log:"
            xcrun notarytool log "${submission_id}" \
                --apple-id "${APPLE_ID}" \
                --password "${APPLE_ID_PASSWORD}" \
                --team-id "${APPLE_TEAM_ID}"
        fi
        exit 1
    fi

    # Clean up notarization ZIP
    rm -f "${notarization_zip}"

    # Staple the notarization ticket to the app
    log_info "Stapling notarization ticket..."
    xcrun stapler staple "${universal_app}"

    # Verify stapling
    if stapler check "${universal_app}" 2>&1; then
        log_success "Notarization ticket stapled successfully"
    else
        log_warn "Stapling verification failed (ticket may still be available online)"
    fi
}

# ---------------------------------------------------------------------------
# Step 6: Create DMG from universal binary
# ---------------------------------------------------------------------------
create_dmg() {
    if [[ "${SKIP_DMG}" == true ]]; then
        log_step "Skipping DMG creation (--skip-dmg)"
        return
    fi

    log_step "Creating DMG from universal binary"

    local universal_app="${BUILD_UNIVERSAL}/${APP_NAME}.app"
    local version
    version="$(node -p "require('${PROJECT_ROOT}/package.json').version" 2>/dev/null || echo "0.0.0")"

    # Define DMG paths
    local dmg_name="RealVibecode-universal-${version}.dmg"
    local dmg_path="${DIST_DIR}/${dmg_name}"
    local dmg_temp="${BUILD_UNIVERSAL}/dmg-temp"

    if [[ ! -d "${universal_app}" ]]; then
        log_error "Universal app not found: ${universal_app}"
        exit 1
    fi

    # Clean up any existing DMG
    rm -f "${dmg_path}"

    # Create temporary DMG staging directory
    rm -rf "${dmg_temp}"
    mkdir -p "${dmg_temp}"

    # Copy app to staging
    cp -R "${universal_app}" "${dmg_temp}/"

    # Create Applications symlink
    ln -s /Applications "${dmg_temp}/Applications"

    # Create the DMG using hdiutil
    log_info "Creating DMG image..."
    hdiutil create \
        -volname "${APP_NAME}" \
        -srcfolder "${dmg_temp}" \
        -ov \
        -format UDZO \
        -imagekey zlib-level=9 \
        "${dmg_path}"

    # Clean up staging
    rm -rf "${dmg_temp}"

    # Sign the DMG if signing is enabled
    if [[ "${SKIP_SIGN}" == false ]]; then
        local signing_identity
        if [[ -n "${APPLE_TEAM_ID:-}" ]]; then
            signing_identity="Developer ID Application: ${APP_NAME} Project (${APPLE_TEAM_ID})"
        else
            signing_identity="$(security find-identity -v -p codesigning 2>/dev/null \
                | grep "Developer ID Application" | head -1 \
                | sed 's/.*"\(.*\)".*/\1/' || true)"
        fi

        if [[ -n "${signing_identity}" ]]; then
            log_info "Signing DMG..."
            codesign --force --sign "${signing_identity}" --timestamp "${dmg_path}"

            # Staple notarization to DMG
            if [[ "${SKIP_NOTARIZE}" == false ]]; then
                log_info "Stapling notarization ticket to DMG..."
                xcrun stapler staple "${dmg_path}" 2>/dev/null || true
            fi

            log_success "DMG signed"
        else
            log_warn "Could not sign DMG — no signing identity found"
        fi
    fi

    # Report
    local dmg_size
    dmg_size="$(du -sh "${dmg_path}" | cut -f1)"
    log_success "DMG created: ${dmg_path} (${dmg_size})"

    # Also create a ZIP for auto-update distribution
    local zip_name="RealVibecode-universal-${version}-mac.zip"
    local zip_path="${DIST_DIR}/${zip_name}"

    log_info "Creating ZIP for auto-update distribution..."
    ditto -c -k --keepParent "${universal_app}" "${zip_path}"
    local zip_size
    zip_size="$(du -sh "${zip_path}" | cut -f1)"
    log_success "ZIP created: ${zip_path} (${zip_size})"
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
summarize() {
    log_step "Build Summary"

    local version
    version="$(node -p "require('${PROJECT_ROOT}/package.json').version" 2>/dev/null || echo "0.0.0")"
    local universal_app="${BUILD_UNIVERSAL}/${APP_NAME}.app"

    echo ""
    echo -e "  ${CYAN}Application:${NC}   ${APP_NAME}"
    echo -e "  ${CYAN}Version:${NC}       ${version}"
    echo -e "  ${CYAN}Bundle ID:${NC}    ${BUNDLE_ID}"
    echo ""

    if [[ -d "${universal_app}" ]]; then
        local archs
        archs="$(lipo -archs "${universal_app}/Contents/MacOS/${APP_NAME}" 2>/dev/null || echo "unknown")"
        local app_size
        app_size="$(du -sh "${universal_app}" | cut -f1)"
        echo -e "  ${GREEN}✓${NC} Universal App:  ${universal_app}"
        echo -e "    Architectures:  ${archs}"
        echo -e "    Size:           ${app_size}"
    fi

    local dmg_path
    dmg_path="$(find "${DIST_DIR}" -name "RealVibecode-universal-*.dmg" -maxdepth 1 2>/dev/null | head -1 || true)"
    if [[ -n "${dmg_path}" ]]; then
        local dmg_size
        dmg_size="$(du -sh "${dmg_path}" | cut -f1)"
        echo -e "  ${GREEN}✓${NC} DMG:            ${dmg_path} (${dmg_size})"
    fi

    local zip_path
    zip_path="$(find "${DIST_DIR}" -name "RealVibecode-universal-*-mac.zip" -maxdepth 1 2>/dev/null | head -1 || true)"
    if [[ -n "${zip_path}" ]]; then
        local zip_size
        zip_size="$(du -sh "${zip_path}" | cut -f1)"
        echo -e "  ${GREEN}✓${NC} ZIP:            ${zip_path} (${zip_size})"
    fi

    echo ""
    if [[ "${SKIP_SIGN}" == false ]]; then
        echo -e "  ${GREEN}✓${NC} Code signed"
    else
        echo -e "  ${YELLOW}⚠${NC} Code signing skipped"
    fi

    if [[ "${SKIP_NOTARIZE}" == false ]] && [[ "${SKIP_SIGN}" == false ]]; then
        echo -e "  ${GREEN}✓${NC} Notarized"
    else
        echo -e "  ${YELLOW}⚠${NC} Notarization skipped"
    fi

    echo ""
    log_success "Universal macOS build complete!"
    echo ""

    # Print usage hint
    echo -e "  ${CYAN}To install:${NC}  Open the DMG and drag ${APP_NAME}.app to Applications"
    echo -e "  ${CYAN}To verify:${NC}  codesign --verify --deep --strict '${universal_app}'"
    echo -e "  ${CYAN}To test:${NC}    open '${universal_app}'"
}

# ---------------------------------------------------------------------------
# Main execution
# ---------------------------------------------------------------------------
main() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║          Real Vibecode — Universal macOS Build                ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log_info "Skip sign:     ${SKIP_SIGN}"
    log_info "Skip notarize: ${SKIP_NOTARIZE}"
    log_info "Skip DMG:      ${SKIP_DMG}"
    log_info "Clean:         ${CLEAN}"
    echo ""

    # Step 1: Validate
    validate_environment

    # Step 2: Clean if requested
    clean_builds

    # Step 3: Build x64
    build_x64

    # Step 4: Build arm64
    build_arm64

    # Step 5: Create universal binary
    create_universal

    # Step 6: Sign the universal binary
    sign_universal

    # Step 7: Notarize the universal binary
    notarize_universal

    # Step 8: Create DMG
    create_dmg

    # Step 9: Summary
    summarize
}

# Run main
main
