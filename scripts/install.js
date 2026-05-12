#!/usr/bin/env node

/**
 * CC_Working_Env Plugin Installer
 *
 * 自动将插件安装到 Claude Code 插件目录，并配置 settings.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGIN_ROOT = path.resolve(__dirname, '..');

// Helper function for user confirmation
function askConfirmation(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(question + ' ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

// Main installer function
async function install() {
  // Determine Claude config directory
  const CLAUDE_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude');
  const PLUGINS_DIR = path.join(CLAUDE_CONFIG_DIR, 'plugins');
  const PLUGIN_NAME = 'cc-working-env';
  const PLUGIN_INSTALL_PATH = path.join(PLUGINS_DIR, PLUGIN_NAME);
  const SETTINGS_FILE = path.join(CLAUDE_CONFIG_DIR, 'settings.json');

  console.log('📦 CC_Working_Env Plugin Installer');
  console.log('===================================\n');

  // Check if already installed
  if (fs.existsSync(PLUGIN_INSTALL_PATH)) {
    console.log(`⚠️  Plugin already installed at: ${PLUGIN_INSTALL_PATH}`);
    const overwrite = await askConfirmation('\nOverwrite existing installation? (y/n)');
    if (!overwrite) {
      console.log('❌ Installation cancelled');
      process.exit(0);
    }
    fs.rmSync(PLUGIN_INSTALL_PATH, { recursive: true, force: true });
  }

  // Create plugins directory
  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    console.log(`✓ Created plugins directory: ${PLUGINS_DIR}`);
  }

  // Copy plugin files
  console.log(`\n📁 Installing to: ${PLUGIN_INSTALL_PATH}`);
  fs.cpSync(PLUGIN_ROOT, PLUGIN_INSTALL_PATH, { recursive: true, force: true });
  console.log('✓ Plugin files copied\n');

  // Build the plugin if dist doesn't exist or is outdated
  const distPath = path.join(PLUGIN_INSTALL_PATH, 'dist');
  const srcPath = path.join(PLUGIN_INSTALL_PATH, 'src');

  if (!fs.existsSync(distPath) || !fs.existsSync(path.join(PLUGIN_INSTALL_PATH, 'node_modules'))) {
    console.log('🔨 Building plugin...');
    try {
      const { execSync } = await import('child_process');
      execSync('npm install --silent', { cwd: PLUGIN_INSTALL_PATH, stdio: 'pipe' });
      execSync('npm run build --silent', { cwd: PLUGIN_INSTALL_PATH, stdio: 'pipe' });
      console.log('✓ Plugin built successfully\n');
    } catch (error) {
      console.error('✗ Build failed:', error.message);
      console.log('\nPlease manually build the plugin:');
      console.log(`  cd ${PLUGIN_INSTALL_PATH}`);
      console.log('  npm install');
      console.log('  npm run build');
    }
  } else {
    console.log('✓ Plugin already built');
  }

  // Update settings.json
  let settings = {};
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      console.log('\n⚙️  Found existing settings.json');
    }
  } catch (error) {
    console.error('⚠️  Could not read settings.json:', error.message);
  }

  // Add statusLine configuration
  const statusLineCommand = `node ${PLUGIN_INSTALL_PATH.replace(/\\/g, '/')}dist/index.js`;

  if (settings.statusLine && settings.statusLine.command) {
    console.log('\n⚠️  statusLine already configured');
    const replace = await askConfirmation('Replace existing statusLine configuration? (y/n)');
    if (!replace) {
      console.log('Kept existing statusLine configuration');
    } else {
      settings.statusLine = {
        command: statusLineCommand,
        interval: 3000
      };
    }
  } else {
    settings.statusLine = {
      command: statusLineCommand,
      interval: 3000
    };
  }

  // Save settings.json
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    console.log('✓ Updated settings.json with statusLine configuration');
  } catch (error) {
    console.error('⚠️  Could not save settings.json:', error.message);
  }

  // Final summary
  console.log('\n===================================');
  console.log('✅ CC_Working_Env installed successfully!\n');
  console.log('📍 Plugin location:', PLUGIN_INSTALL_PATH);
  console.log('📋 Settings file:', SETTINGS_FILE);
  console.log('\n🔄 Please restart Claude Code to activate the plugin.\n');
  console.log('Usage:');
  console.log('  /plugin cc-working-env status   - Show current status');
  console.log('  /plugin cc-working-env show     - Show detailed stats');
  console.log('  /plugin cc-working-env reset    - Reset all stats');
  console.log('\nTo uninstall:');
  console.log(`  cd ${PLUGIN_INSTALL_PATH}`);
  console.log('  npm run uninstall');
}

// Run installer
install().catch(error => {
  console.error('Installation failed:', error);
  process.exit(1);
});
