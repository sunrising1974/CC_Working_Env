#!/usr/bin/env node

/**
 * CC_Working_Env Plugin Uninstaller
 *
 * 卸载插件并清理配置
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGIN_ROOT = path.resolve(__dirname, '..');

// Determine Claude config directory
const CLAUDE_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude');
const PLUGINS_DIR = path.join(CLAUDE_CONFIG_DIR, 'plugins');
const PLUGIN_NAME = 'cc-working-env';
const PLUGIN_INSTALL_PATH = path.join(PLUGINS_DIR, PLUGIN_NAME);
const SETTINGS_FILE = path.join(CLAUDE_CONFIG_DIR, 'settings.json');
const STATS_FILE = path.join(CLAUDE_CONFIG_DIR, 'modelstats.json');
const SESSION_FILE = path.join(CLAUDE_CONFIG_DIR, 'modelstats-session.json');

console.log('🗑️  CC_Working_Env Plugin Uninstaller');
console.log('=====================================\n');

// Check if installed
if (!fs.existsSync(PLUGIN_INSTALL_PATH)) {
  console.log(`❌ Plugin not found at: ${PLUGIN_INSTALL_PATH}`);
  console.log('\nNothing to uninstall.');
  process.exit(0);
}

console.log(`📍 Plugin location: ${PLUGIN_INSTALL_PATH}\n`);

// Remove plugin directory
console.log('📁 Removing plugin files...');
try {
  fs.rmSync(PLUGIN_INSTALL_PATH, { recursive: true, force: true });
  console.log('✓ Plugin files removed');
} catch (error) {
  console.error('✗ Failed to remove plugin files:', error.message);
}

// Clean up settings.json
let settings = {};
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));

    // Check if statusLine references this plugin
    if (settings.statusLine && settings.statusLine.command?.includes(PLUGIN_NAME)) {
      delete settings.statusLine;
      console.log('✓ Removed statusLine configuration from settings.json');
    }

    // Save updated settings
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  }
} catch (error) {
  console.error('⚠️  Could not update settings.json:', error.message);
}

// Ask about data files
console.log('\n📊 Data files found:');
console.log(`  - ${STATS_FILE}`);
console.log(`  - ${SESSION_FILE}`);

const keepData = confirm('\nKeep data files for future reinstallation? (y/n): ');

if (!keepData) {
  try {
    if (fs.existsSync(STATS_FILE)) {
      fs.unlinkSync(STATS_FILE);
      console.log('✓ Removed stats file');
    }
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
      console.log('✓ Removed session file');
    }
  } catch (error) {
    console.error('⚠️  Could not remove data files:', error.message);
  }
} else {
  console.log('✓ Kept data files');
}

// Final summary
console.log('\n=====================================');
console.log('✅ CC_Working_Env uninstalled successfully!\n');

if (!keepData) {
  console.log('All plugin files and data have been removed.');
} else {
  console.log('Plugin files removed. Data files preserved.');
  console.log(`Data files location:`);
  console.log(`  ${STATS_FILE}`);
  console.log(`  ${SESSION_FILE}`);
}

console.log('\n🔄 Please restart Claude Code if it is running.\n');
