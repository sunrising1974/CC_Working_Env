# CC_Working_Env Plugin Uninstaller for PowerShell
# 双击运行此脚本来卸载插件

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  CC_Working_Env Uninstaller" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$PLUGIN_NAME = "cc-working-env"

if ($env:CLAUDE_CONFIG_DIR) {
    $CLAUDE_CONFIG_DIR = $env:CLAUDE_CONFIG_DIR
} else {
    $CLAUDE_CONFIG_DIR = Join-Path $env:USERPROFILE ".claude"
}

$PLUGINS_DIR = Join-Path $CLAUDE_CONFIG_DIR "plugins"
$PLUGIN_INSTALL_PATH = Join-Path $PLUGINS_DIR $PLUGIN_NAME
$SETTINGS_FILE = Join-Path $CLAUDE_CONFIG_DIR "settings.json"
$STATS_FILE = Join-Path $CLAUDE_CONFIG_DIR "modelstats.json"
$SESSION_FILE = Join-Path $CLAUDE_CONFIG_DIR "modelstats-session.json"

# Check if installed
if (-not (Test-Path $PLUGIN_INSTALL_PATH)) {
    Write-Host "❌ Plugin not found at: $PLUGIN_INSTALL_PATH" -ForegroundColor Red
    Write-Host "`nNothing to uninstall." -ForegroundColor Yellow
    exit 0
}

Write-Host "📍 Plugin location: $PLUGIN_INSTALL_PATH" -ForegroundColor Green
Write-Host ""

# Remove plugin directory
Write-Host "Removing plugin files..." -ForegroundColor Yellow
Remove-Item -Path $PLUGIN_INSTALL_PATH -Recurse -Force
Write-Host "✓ Plugin files removed" -ForegroundColor Green

# Clean up settings.json
if (Test-Path $SETTINGS_FILE) {
    $settings = Get-Content $SETTINGS_FILE -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($settings.statusLine -and $settings.statusLine.command -match $PLUGIN_NAME) {
        $settings.PSObject.Properties.Remove('statusLine')
        $settings | ConvertTo-Json -Depth 10 | Set-Content $SETTINGS_FILE -Encoding UTF8
        Write-Host "✓ Removed statusLine from settings.json" -ForegroundColor Green
    }
}

# Ask about data files
Write-Host "`n📊 Data files found:" -ForegroundColor Yellow
Write-Host "  - $STATS_FILE"
Write-Host "  - $SESSION_FILE"

$response = Read-Host "`nKeep data files for future reinstallation? (y/n)"

if ($response -ne 'y' -and $response -ne 'Y') {
    if (Test-Path $STATS_FILE) {
        Remove-Item $STATS_FILE -Force
        Write-Host "✓ Removed stats file" -ForegroundColor Green
    }
    if (Test-Path $SESSION_FILE) {
        Remove-Item $SESSION_FILE -Force
        Write-Host "✓ Removed session file" -ForegroundColor Green
    }
} else {
    Write-Host "✓ Kept data files" -ForegroundColor Green
}

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "✅ CC_Working_Env uninstalled successfully!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔄 Please restart Claude Code if it is running." -ForegroundColor Yellow
