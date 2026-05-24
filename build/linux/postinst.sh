#!/bin/bash
# Post-install script for Real Vibecode DEB package
# Updates desktop database and mimetype associations

set -e

# Update desktop database
if command -v update-desktop-database &>/dev/null; then
    update-desktop-database -f /usr/share/applications 2>/dev/null || true
fi

# Update mime database
if command -v update-mime-database &>/dev/null; then
    update-mime-database /usr/share/mime 2>/dev/null || true
fi

# Update icon cache
if command -v gtk-update-icon-cache &>/dev/null; then
    gtk-update-icon-cache -f /usr/share/icons/hicolor 2>/dev/null || true
fi

# Register vibecode:// protocol handler
if command -v xdg-mime &>/dev/null; then
    xdg-mime default real-vibecode-url-handler.desktop x-scheme-handler/vibecode 2>/dev/null || true
fi

exit 0
