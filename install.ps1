# CC_Working_Env Plugin Installer for PowerShell
# 双击运行此脚本来安装插件

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  CC_Working_Env Plugin Installer" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Get plugin directory
$PLUGIN_ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$PLUGIN_NAME = "cc-working-env"

# Determine Claude config directory
if ($env:CLAUDE_CONFIG_DIR) {
    $CLAUDE_CONFIG_DIR = $env:CLAUDE_CONFIG_DIR
} else {
    $CLAUDE_CONFIG_DIR = Join-Path $env:USERPROFILE ".claude"
}

$PLUGINS_DIR = Join-Path $CLAUDE_CONFIG_DIR "plugins"
$PLUGIN_INSTALL_PATH = Join-Path $PLUGINS_DIR $PLUGIN_NAME
$SETTINGS_FILE = Join-Path $CLAUDE_CONFIG_DIR "settings.json"

Write-Host "📍 Plugin source:" $PLUGIN_ROOT -ForegroundColor Green
Write-Host "📍 Install path:" $PLUGIN_INSTALL_PATH -ForegroundColor Green
Write-Host ""

# Create plugins directory if it doesn't exist
if (-not (Test-Path $PLUGINS_DIR)) {
    Write-Host "Creating plugins directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $PLUGINS_DIR -Force | Out-Null
    Write-Host "✓ Created: $PLUGINS_DIR" -ForegroundColor Green
}

# Check if already installed
if (Test-Path $PLUGIN_INSTALL_PATH) {
    Write-Host "⚠️  Plugin already exists at: $PLUGIN_INSTALL_PATH" -ForegroundColor Yellow
    $response = Read-Host "Overwrite existing installation? (y/n)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "❌ Installation cancelled" -ForegroundColor Red
        exit 0
    }
    Remove-Item -Path $PLUGIN_INSTALL_PATH -Recurse -Force
}

# Copy plugin files
Write-Host "`nCopying plugin files..." -ForegroundColor Yellow
Copy-Item -Path $PLUGIN_ROOT\* -Destination $PLUGIN_INSTALL_PATH -Recurse -Force
Write-Host "✓ Files copied" -ForegroundColor Green

# Install dependencies and build
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
Set-Location $PLUGIN_INSTALL_PATH
npm install --silent | Out-Null
Write-Host "✓ Dependencies installed" -ForegroundColor Green

Write-Host "Building plugin..." -ForegroundColor Yellow
npm run build --silent | Out-Null
Write-Host "✓ Plugin built" -ForegroundColor Green

# Update settings.json
$settings = @{}
if (Test-Path $SETTINGS_FILE) {
    $settingsContent = Get-Content $SETTINGS_FILE -Raw -Encoding UTF8
    $settings = $settingsContent | ConvertFrom-Json
    Write-Host "`nFound existing settings.json" -ForegroundColor Yellow
}

$statusLineCommand = "node $($PLUGIN_INSTALL_PATH.Replace('\', '/'))dist/index.js"

if ($settings.statusLine -and $settings.statusLine.command) {
    Write-Host "`n⚠️  statusLine already configured" -ForegroundColor Yellow
    $response = Read-Host "Replace existing statusLine configuration? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        $settings.statusLine = [PSCustomObject]@{
            command = $statusLineCommand
            interval = 3000
        }
    }
} else {
    $settings.statusLine = [PSCustomObject]@{
        command = $statusLineCommand
        interval = 3000
    }
}

$settings | ConvertTo-Json -Depth 10 | Set-Content $SETTINGS_FILE -Encoding UTF8
Write-Host "✓ Updated settings.json" -ForegroundColor Green

# Summary
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "✅ CC_Working_Env installed successfully!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Plugin location: $PLUGIN_INSTALL_PATH" -ForegroundColor White
Write-Host "📋 Settings file: $SETTINGS_FILE" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Please restart Claude Code to activate the plugin." -ForegroundColor Yellow
Write-Host ""
Write-Host "Usage after restart:" -ForegroundColor White
Write-Host "  /plugin cc-working-env status   - Show current status"
Write-Host "  /plugin cc-working-env show     - Show detailed stats"
Write-Host "  /plugin cc-working-env reset    - Reset all stats"
Write-Host ""
Write-Host "To uninstall:" -ForegroundColor White
Write-Host "  .\uninstall.ps1"
Write-Host ""
