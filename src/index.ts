#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Stats storage file path
const STATS_FILE = path.join(
  process.env.CLAUDE_CONFIG_DIR || path.join(process.env.HOME || '', '.claude'),
  'modelstats.json'
);

// Default model mapping based on Claude Code config
const MODEL_MAP: Record<string, string> = {
  haiku: 'Qwen25',
  sonnet: 'Qwen3',
  opus: 'Qwen35',
};

// Context window sizes for different models (in tokens)
const CONTEXT_WINDOW_SIZES: Record<string, number> = {
  Qwen25: 131_072,     // Qwen2.5: 128K context
  Qwen3: 256_000,      // Qwen3: ~256K context
  Qwen35: 256_000,     // Qwen3.5: ~256K context
  Modelscope_Qwen25: 131_072,
  Modelscope_Qwen3: 256_000,
  Modelscope_Qwen35: 256_000,
  Modelscope_Qwen_Comb: 256_000,
};

// Session state file for tracking Skill and Agent usage
const SESSION_FILE = path.join(
  process.env.CLAUDE_CONFIG_DIR || path.join(process.env.HOME || '', '.claude'),
  'modelstats-session.json'
);

interface ModelStats {
  totalTokens: number;
  callCount: number;
  currentModel: string;
  sessionInputTokens: number;   // 当前会话输入 token
  sessionOutputTokens: number;  // 当前会话输出 token
  currentSkill?: string;        // 当前使用的 Skill
  currentAgent?: string;        // 正在调用的 Agent
  lastUpdated: string;
}

interface SessionState {
  currentSkill?: string;
  currentAgent?: string;
  skillUsage: Record<string, number>;  // Skill 使用次数
  agentUsage: Record<string, number>;  // Agent 使用次数
  lastUpdated: string;
}

/**
 * Load session state for Skill/Agent tracking
 */
function loadSessionState(): SessionState {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = fs.readFileSync(SESSION_FILE, 'utf-8');
      const parsed = JSON.parse(data) as SessionState;
      return {
        currentSkill: parsed.currentSkill,
        currentAgent: parsed.currentAgent,
        skillUsage: parsed.skillUsage || {},
        agentUsage: parsed.agentUsage || {},
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error('[modelstats] Error loading session state:', error);
  }
  return {
    currentSkill: undefined,
    currentAgent: undefined,
    skillUsage: {},
    agentUsage: {},
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Save session state
 */
function saveSessionState(state: SessionState): void {
  try {
    state.lastUpdated = new Date().toISOString();
    const dir = path.dirname(SESSION_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SESSION_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('[modelstats] Error saving session state:', error);
  }
}

/**
 * Load stats from JSON file or return defaults
 */
function loadStats(): ModelStats {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const data = fs.readFileSync(STATS_FILE, 'utf-8');
      const parsed = JSON.parse(data) as ModelStats;
      const sessionState = loadSessionState();
      return {
        totalTokens: parsed.totalTokens || 0,
        callCount: parsed.callCount || 0,
        currentModel: parsed.currentModel || getModelFromEnv(),
        sessionInputTokens: parsed.sessionInputTokens || 0,
        sessionOutputTokens: parsed.sessionOutputTokens || 0,
        currentSkill: sessionState.currentSkill || parsed.currentSkill,
        currentAgent: sessionState.currentAgent || parsed.currentAgent,
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error('[modelstats] Error loading stats:', error);
  }
  return {
    totalTokens: 0,
    callCount: 0,
    currentModel: getModelFromEnv(),
    sessionInputTokens: 0,
    sessionOutputTokens: 0,
    currentSkill: undefined,
    currentAgent: undefined,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Save stats to JSON file
 */
function saveStats(stats: ModelStats): void {
  try {
    stats.lastUpdated = new Date().toISOString();
    const dir = path.dirname(STATS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');

    // Also update session state for Skill/Agent
    const sessionState = loadSessionState();
    if (stats.currentSkill) sessionState.currentSkill = stats.currentSkill;
    if (stats.currentAgent) sessionState.currentAgent = stats.currentAgent;
    saveSessionState(sessionState);
  } catch (error) {
    console.error('[modelstats] Error saving stats:', error);
  }
}

/**
 * Get current model from environment or config
 */
function getModelFromEnv(): string {
  // Check environment variables first
  if (process.env.ANTHROPIC_MODEL) {
    return process.env.ANTHROPIC_MODEL;
  }
  if (process.env.MODEL) {
    return process.env.MODEL;
  }

  // Try to read from settings.json
  try {
    const settingsPath = path.join(
      process.env.CLAUDE_CONFIG_DIR || path.join(process.env.HOME || '', '.claude'),
      'settings.json'
    );
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (settings.model) {
        return MODEL_MAP[settings.model.toLowerCase()] || settings.model;
      }
    }
  } catch (error) {
    // Ignore errors, return default
  }

  return 'Qwen3'; // Default fallback
}

/**
 * Get context window size for current model
 */
function getContextWindowSize(model: string): number {
  // Try exact match first
  if (CONTEXT_WINDOW_SIZES[model]) {
    return CONTEXT_WINDOW_SIZES[model];
  }

  // Try partial match
  for (const [key, size] of Object.entries(CONTEXT_WINDOW_SIZES)) {
    if (model.toLowerCase().includes(key.toLowerCase())) {
      return size;
    }
  }

  // Default to 256K if unknown
  return 256_000;
}

/**
 * Calculate context usage percentage
 */
function calculateContextUsage(sessionTokens: number, model: string): number {
  const contextSize = getContextWindowSize(model);
  return Math.min((sessionTokens / contextSize) * 100, 100);
}

/**
 * Update stats with a new API call
 */
export function updateStats(inputTokens?: number, outputTokens?: number, model?: string): ModelStats {
  const stats = loadStats();

  // Increment call count
  stats.callCount += 1;

  // Add tokens if provided
  const totalCallTokens = (inputTokens || 0) + (outputTokens || 0);
  if (totalCallTokens > 0) {
    stats.totalTokens += totalCallTokens;
  }

  // Update session tokens
  if (inputTokens && typeof inputTokens === 'number') {
    stats.sessionInputTokens += inputTokens;
  }
  if (outputTokens && typeof outputTokens === 'number') {
    stats.sessionOutputTokens += outputTokens;
  }

  // Update model if provided
  if (model) {
    stats.currentModel = model;
  } else {
    // Otherwise refresh from env/config
    stats.currentModel = getModelFromEnv();
  }

  saveStats(stats);
  return stats;
}

/**
 * Update session tokens only (for context tracking)
 */
export function updateSessionTokens(inputTokens: number, outputTokens: number): ModelStats {
  const stats = loadStats();
  stats.sessionInputTokens = inputTokens;
  stats.sessionOutputTokens = outputTokens;
  stats.totalTokens = inputTokens + outputTokens;
  saveStats(stats);
  return stats;
}

/**
 * Set current Skill being used
 */
export function setCurrentSkill(skillName: string): ModelStats {
  const stats = loadStats();
  stats.currentSkill = skillName;

  // Track skill usage count
  const sessionState = loadSessionState();
  sessionState.skillUsage[skillName] = (sessionState.skillUsage[skillName] || 0) + 1;
  saveSessionState(sessionState);

  saveStats(stats);
  return stats;
}

/**
 * Set current Agent being called
 */
export function setCurrentAgent(agentName: string): ModelStats {
  const stats = loadStats();
  stats.currentAgent = agentName;

  // Track agent usage count
  const sessionState = loadSessionState();
  sessionState.agentUsage[agentName] = (sessionState.agentUsage[agentName] || 0) + 1;
  saveSessionState(sessionState);

  saveStats(stats);
  return stats;
}

/**
 * Format tokens for display
 */
function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Format context percentage for display
 */
function formatContextPercentage(sessionTokens: number, model: string): string {
  const percentage = calculateContextUsage(sessionTokens, model);
  return `${percentage.toFixed(1)}%`;
}

/**
 * Generate status line output
 */
function generateStatusLine(): string {
  const stats = loadStats();
  const model = stats.currentModel || '未知';
  const tokens = formatTokens(stats.totalTokens);
  const calls = stats.callCount;
  const sessionTokens = stats.sessionInputTokens + stats.sessionOutputTokens;
  const contextUsage = formatContextPercentage(sessionTokens, model);
  const skill = stats.currentSkill || '-';
  const agent = stats.currentAgent || '-';

  // Compact format for status line: Model | Context% | Tokens | Calls | Skill | Agent
  return `📊 ${model} | 🧠 ${contextUsage} | 💰 ${tokens} | 🔢 ${calls} | 🔧 ${skill} | 🤖 ${agent}`;
}

/**
 * Generate detailed status output
 */
function generateDetailedStatus(): string {
  const stats = loadStats();
  const sessionState = loadSessionState();
  const model = stats.currentModel || '未知';
  const contextSize = getContextWindowSize(model);
  const sessionTokens = stats.sessionInputTokens + stats.sessionOutputTokens;
  const contextUsage = calculateContextUsage(sessionTokens, model);

  const lines = [
    `📊 模型统计`,
    `├─ 当前模型：${model}`,
    `├─ 上下文窗口：${(contextSize / 1000).toFixed(0)}K tokens`,
    `├─ 会话输入：${formatTokens(stats.sessionInputTokens)} tokens`,
    `├─ 会话输出：${formatTokens(stats.sessionOutputTokens)} tokens`,
    `├─ 上下文占用：${contextUsage.toFixed(1)}%`,
    `├─ 总消耗：${formatTokens(stats.totalTokens)} tokens`,
    `├─ 总调用：${stats.callCount.toLocaleString()} 次`,
    `├─ 当前 Skill: ${stats.currentSkill || '-'}`,
    `├─ 当前 Agent: ${stats.currentAgent || '-'}`,
  ];

  // Add skill usage summary
  if (Object.keys(sessionState.skillUsage).length > 0) {
    lines.push(`├─ Skill 使用:`);
    for (const [skill, count] of Object.entries(sessionState.skillUsage).slice(0, 5)) {
      lines.push(`│  ├─ ${skill}: ${count} 次`);
    }
  }

  // Add agent usage summary
  if (Object.keys(sessionState.agentUsage).length > 0) {
    lines.push(`├─ Agent 使用:`);
    for (const [agent, count] of Object.entries(sessionState.agentUsage).slice(0, 5)) {
      lines.push(`│  ├─ ${agent}: ${count} 次`);
    }
  }

  lines.push(`└─ 最后更新：${new Date(stats.lastUpdated).toLocaleString('zh-CN')}`);

  return lines.join('\n');
}

/**
 * Main entry point - outputs status line
 */
function main(): void {
  try {
    const args = process.argv.slice(2);

    // Check for detailed mode
    if (args.includes('--detailed') || args.includes('-d')) {
      process.stdout.write(generateDetailedStatus() + '\n');
    } else {
      const statusLine = generateStatusLine();
      process.stdout.write(statusLine + '\n');
    }
  } catch (error) {
    process.stderr.write('[modelstats] Error: ' + error + '\n');
    process.exit(1);
  }
}

// Run main when executed directly
main();

// Also export for use as a module
export { loadStats, saveStats, getModelFromEnv, loadSessionState, saveSessionState };
