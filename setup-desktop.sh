#!/bin/bash
# Card Conjurer — desktop setup script for Linux Mint
# Run this ONCE from inside the cardconjurer folder.
# It creates a double-clickable icon on ~/Desktop/.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
DESKTOP_FILE="$HOME/Desktop/Card Conjurer.desktop"

echo "================================="
echo "  Card Conjurer — Desktop Setup"
echo "================================="
echo ""
echo "Project folder: $PROJECT_DIR"
echo ""

# --- 1. Make the launcher script executable ---
if [ -f "$PROJECT_DIR/start-cardconjurer.sh" ]; then
    chmod +x "$PROJECT_DIR/start-cardconjurer.sh"
    echo "[OK] start-cardconjurer.sh is executable"
else
    echo "[ERROR] start-cardconjurer.sh not found in $PROJECT_DIR"
    echo "        Make sure you're running this from the correct folder."
    exit 1
fi

# --- 2. Create the desktop launcher ---
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Type=Application
Name=Card Conjurer
Comment=Custom Magic: The Gathering card creator
Exec=$PROJECT_DIR/start-cardconjurer.sh
Icon=$PROJECT_DIR/core/apple-touch-icon.png
Terminal=true
Categories=Game;Graphics;
EOF

chmod +x "$DESKTOP_FILE"

if [ -f "$DESKTOP_FILE" ]; then
    echo "[OK] Desktop launcher created: $DESKTOP_FILE"
else
    echo "[ERROR] Could not create desktop launcher."
    exit 1
fi

# --- 3. Done ---
echo ""
echo "================================="
echo "  All set!"
echo ""
echo "  Double-click the 'Card Conjurer'"
echo "  icon on your desktop to start."
echo "================================="
