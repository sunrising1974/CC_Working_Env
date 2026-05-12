#!/bin/bash

# CC_Working_Env Plugin Installer for Unix/Linux/Mac
# Run with: bash install.sh

set -e

echo "====================================="
echo "  CC_Working_Env Plugin Installer"
echo "====================================="
echo ""

# Get plugin directory
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_NAME="cc-working-env"

# Determine Claude config directory
if [ -n "$CLAUDE_CONFIG_DIR" ]; then
    CLAUDE_CONFIG_DIR="$CLAUDE_CONFIG_DIR"
else
    CLAUDE_CONFIG_DIR="$HOME/.claude"
fi

PLUGINS_DIR="$CLAUDE_CONFIG_DIR/plugins"
PLUGIN_INSTALL_PATH="$PLUGINS_DIR/$PLUGIN_NAME"
SETTINGS_FILE="$CLAUDE_CONFIG_DIR/settings.json"

echo "📍 Plugin source: $PLUGIN_ROOT"
echo "📍 Install path: $PLUGIN_INSTALL_PATH"
echo ""

# Create plugins directory if it doesn't exist
if [ ! -d "$PLUGINS_DIR" ]; then
    echo "Creating plugins directory..."
    mkdir -p "$PLUGINS_DIR"
    echo "✓ Created: $PLUGINS_DIR"
fi

# Check if already installed
if [ -d "$PLUGIN_INSTALL_PATH" ]; then
    echo "⚠️  Plugin already exists at: $PLUGIN_INSTALL_PATH"
    read -p "Overwrite existing installation? (y/n): " response
    if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
        echo "❌ Installation cancelled"
        exit 0
    fi
    rm -rf "$PLUGIN_INSTALL_PATH"
fi

# Copy plugin files
echo ""
echo "Copying plugin files..."
cp -r "$PLUGIN_ROOT"/* "$PLUGIN_INSTALL_PATH/"
echo "✓ Files copied"

# Install dependencies and build
echo ""
echo "Installing dependencies..."
cd "$PLUGIN_INSTALL_PATH"
npm install --silent
echo "✓ Dependencies installed"

echo "Building plugin..."
npm run build --silent
echo "✓ Plugin built"

# Update settings.json
statusLineCommand="node ${PLUGIN_INSTALL_PATH}/dist/index.js"

if [ -f "$SETTINGS_FILE" ]; then
    echo ""
    echo "Found existing settings.json"

    # Check if statusLine is already configured
    if grep -q '"statusLine"' "$SETTINGS_FILE" 2>/dev/null; then
        echo "⚠️  statusLine already configured"
        read -p "Replace existing statusLine configuration? (y/n): " response
        if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
            # Use jq to update settings if available
            if command -v jq &> /dev/null; then
                jq ".statusLine = {command: \"$statusLineCommand\", interval: 3000}" "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
            else
                echo "⚠️  Please install 'jq' for automatic update, or edit manually"
            fi
        fi
    else
        # Add statusLine to settings
        if command -v jq &> /dev/null; then
            jq ".statusLine = {command: \"$statusLineCommand\", interval: 3000}" "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
        else
            echo "⚠️  Please install 'jq' for automatic update, or edit manually"
        fi
    fi
else
    # Create new settings.json
    cat > "$SETTINGS_FILE" << EOF
{
  "statusLine": {
    "command": "$statusLineCommand",
    "interval": 3000
  }
}
EOF
fi

echo "✓ Updated settings.json"

# Summary
echo ""
echo "====================================="
echo "✅ CC_Working_Env installed successfully!"
echo "====================================="
echo ""
echo "📍 Plugin location: $PLUGIN_INSTALL_PATH"
echo "📋 Settings file: $SETTINGS_FILE"
echo ""
echo "🔄 Please restart Claude Code to activate the plugin."
echo ""
echo "Usage after restart:"
echo "  /plugin cc-working-env status   - Show current status"
echo "  /plugin cc-working-env show     - Show detailed stats"
echo "  /plugin cc-working-env reset    - Reset all stats"
echo ""
echo "To uninstall:"
echo "  bash uninstall.sh"
echo ""
