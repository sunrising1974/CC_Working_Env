#!/bin/bash

# CC_Working_Env Plugin Uninstaller for Unix/Linux/Mac
# Run with: bash uninstall.sh

set -e

echo "====================================="
echo "  CC_Working_Env Uninstaller"
echo "====================================="
echo ""

PLUGIN_NAME="cc-working-env"

if [ -n "$CLAUDE_CONFIG_DIR" ]; then
    CLAUDE_CONFIG_DIR="$CLAUDE_CONFIG_DIR"
else
    CLAUDE_CONFIG_DIR="$HOME/.claude"
fi

PLUGINS_DIR="$CLAUDE_CONFIG_DIR/plugins"
PLUGIN_INSTALL_PATH="$PLUGINS_DIR/$PLUGIN_NAME"
SETTINGS_FILE="$CLAUDE_CONFIG_DIR/settings.json"
STATS_FILE="$CLAUDE_CONFIG_DIR/modelstats.json"
SESSION_FILE="$CLAUDE_CONFIG_DIR/modelstats-session.json"

# Check if installed
if [ ! -d "$PLUGIN_INSTALL_PATH" ]; then
    echo "❌ Plugin not found at: $PLUGIN_INSTALL_PATH"
    echo ""
    echo "Nothing to uninstall."
    exit 0
fi

echo "📍 Plugin location: $PLUGIN_INSTALL_PATH"
echo ""

# Remove plugin directory
echo "Removing plugin files..."
rm -rf "$PLUGIN_INSTALL_PATH"
echo "✓ Plugin files removed"

# Clean up settings.json
if [ -f "$SETTINGS_FILE" ]; then
    if grep -q '"statusLine"' "$SETTINGS_FILE" 2>/dev/null; then
        if grep -q "$PLUGIN_NAME" "$SETTINGS_FILE" 2>/dev/null; then
            if command -v jq &> /dev/null; then
                jq 'del(.statusLine)' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
                echo "✓ Removed statusLine from settings.json"
            else
                echo "⚠️  Please manually remove statusLine from settings.json (install 'jq' for automatic removal)"
            fi
        fi
    fi
fi

# Ask about data files
echo ""
echo "📊 Data files found:"
echo "  - $STATS_FILE"
echo "  - $SESSION_FILE"

read -p "Keep data files for future reinstallation? (y/n): " response

if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
    [ -f "$STATS_FILE" ] && rm -f "$STATS_FILE" && echo "✓ Removed stats file"
    [ -f "$SESSION_FILE" ] && rm -f "$SESSION_FILE" && echo "✓ Removed session file"
else
    echo "✓ Kept data files"
fi

echo ""
echo "====================================="
echo "✅ CC_Working_Env uninstalled successfully!"
echo "====================================="
echo ""
echo "🔄 Please restart Claude Code if it is running."
