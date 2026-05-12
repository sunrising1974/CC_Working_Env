#!/usr/bin/env node

/**
 * modelstats CLI - Update and view model statistics
 *
 * Usage:
 *   modelstats update [input_tokens] [output_tokens] [model]  - Update stats with token usage
 *   modelstats session [input_tokens] [output_tokens]          - Update session context tokens
 *   modelstats skill [skill_name]                              - Set current Skill
 *   modelstats agent [agent_name]                              - Set current Agent
 *   modelstats show                                            - Show current stats
 *   modelstats reset                                           - Reset all stats to zero
 */

import { loadStats, saveStats, updateStats, updateSessionTokens, setCurrentSkill, setCurrentAgent, loadSessionState } from './index.js';
import * as fs from 'fs';
import * as path from 'path';

// Import the context calculation functions by reading index.js again for CLI use
function getContextWindowSize(model: string): number {
  const CONTEXT_WINDOW_SIZES: Record<string, number> = {
    Qwen25: 131_072,
    Qwen3: 256_000,
    Qwen35: 256_000,
    Modelscope_Qwen25: 131_072,
    Modelscope_Qwen3: 256_000,
    Modelscope_Qwen35: 256_000,
    Modelscope_Qwen_Comb: 256_000,
  };

  if (CONTEXT_WINDOW_SIZES[model]) return CONTEXT_WINDOW_SIZES[model];
  for (const [key, size] of Object.entries(CONTEXT_WINDOW_SIZES)) {
    if (model.toLowerCase().includes(key.toLowerCase())) return size;
  }
  return 256_000;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

const command = process.argv[2];

switch (command) {
  case 'update': {
    // New signature: update [input_tokens] [output_tokens] [model]
    const inputTokens = parseInt(process.argv[3]) || 0;
    const outputTokens = parseInt(process.argv[4]) || 0;
    const model = process.argv[5];
    const stats = updateStats(inputTokens, outputTokens, model);
    const sessionTokens = stats.sessionInputTokens + stats.sessionOutputTokens;
    const contextSize = getContextWindowSize(stats.currentModel);
    const contextPct = ((sessionTokens / contextSize) * 100).toFixed(1);
    console.log(`Updated: ${stats.currentModel} | 上下文 ${contextPct}% | ${formatTokens(stats.totalTokens)} tokens | ${stats.callCount} 次`);
    break;
  }

  case 'session': {
    // Update session tokens only (for real-time context tracking)
    const inputTokens = parseInt(process.argv[3]) || 0;
    const outputTokens = parseInt(process.argv[4]) || 0;
    const stats = updateSessionTokens(inputTokens, outputTokens);
    const sessionTokens = stats.sessionInputTokens + stats.sessionOutputTokens;
    const contextSize = getContextWindowSize(stats.currentModel);
    const contextPct = ((sessionTokens / contextSize) * 100).toFixed(1);
    console.log(`Session updated: 输入 ${formatTokens(inputTokens)} | 输出 ${formatTokens(outputTokens)} | 上下文占用 ${contextPct}%`);
    break;
  }

  case 'skill': {
    // Set current Skill
    const skillName = process.argv[3];
    if (!skillName) {
      console.error('Error: Skill name required');
      console.error('Usage: modelstats skill <skill_name>');
      process.exit(1);
    }
    const stats = setCurrentSkill(skillName);
    console.log(`Current Skill set to: ${skillName}`);
    break;
  }

  case 'agent': {
    // Set current Agent
    const agentName = process.argv[3];
    if (!agentName) {
      console.error('Error: Agent name required');
      console.error('Usage: modelstats agent <agent_name>');
      process.exit(1);
    }
    const stats = setCurrentAgent(agentName);
    console.log(`Current Agent set to: ${agentName}`);
    break;
  }

  case 'show': {
    const stats = loadStats();
    const sessionState = loadSessionState();
    const sessionTokens = stats.sessionInputTokens + stats.sessionOutputTokens;
    const contextSize = getContextWindowSize(stats.currentModel);
    const contextPct = ((sessionTokens / contextSize) * 100).toFixed(1);

    console.log('=== Model Statistics ===');
    console.log(`当前模型：${stats.currentModel}`);
    console.log(`上下文窗口：${(contextSize / 1000).toFixed(0)}K tokens`);
    console.log(`会话输入:${formatTokens(stats.sessionInputTokens)} tokens`);
    console.log(`会话输出：${formatTokens(stats.sessionOutputTokens)} tokens`);
    console.log(`上下文占用:${contextPct}%`);
    console.log('---');
    console.log(`总消耗:${formatTokens(stats.totalTokens)} tokens`);
    console.log(`总调用次数：${stats.callCount.toLocaleString()} 次`);
    console.log(`当前 Skill: ${stats.currentSkill || '-'}`);
    console.log(`当前 Agent: ${stats.currentAgent || '-'}`);
    console.log('---');

    // Show Skill usage summary
    if (Object.keys(sessionState.skillUsage).length > 0) {
      console.log('Skill 使用统计:');
      for (const [skill, count] of Object.entries(sessionState.skillUsage).slice(0, 10)) {
        console.log(`  ${skill}: ${count} 次`);
      }
    }

    // Show Agent usage summary
    if (Object.keys(sessionState.agentUsage).length > 0) {
      console.log('Agent 使用统计:');
      for (const [agent, count] of Object.entries(sessionState.agentUsage).slice(0, 10)) {
        console.log(`  ${agent}: ${count} 次`);
      }
    }

    console.log(`最后更新:${new Date(stats.lastUpdated).toLocaleString('zh-CN')}`);
    break;
  }

  case 'reset': {
    const stats = {
      totalTokens: 0,
      callCount: 0,
      currentModel: loadStats().currentModel,
      sessionInputTokens: 0,
      sessionOutputTokens: 0,
      currentSkill: undefined,
      currentAgent: undefined,
      lastUpdated: new Date().toISOString(),
    };
    saveStats(stats);

    // Also reset session state
    const sessionState = {
      currentSkill: undefined,
      currentAgent: undefined,
      skillUsage: {},
      agentUsage: {},
      lastUpdated: new Date().toISOString(),
    };
    const sessionDir = process.env.CLAUDE_CONFIG_DIR || path.join(process.env.HOME || '', '.claude');
    const sessionPath = path.join(sessionDir, 'modelstats-session.json');
    fs.writeFileSync(sessionPath, JSON.stringify(sessionState, null, 2), 'utf-8');

    console.log('Stats reset to zero');
    break;
  }

  case 'clear': {
    // Clear current Skill/Agent without resetting stats
    const stats = loadStats();
    stats.currentSkill = undefined;
    stats.currentAgent = undefined;
    saveStats(stats);
    console.log('Current Skill/Agent cleared');
    break;
  }

  default:
    console.log('modelstats - Model usage statistics tracker');
    console.log('');
    console.log('Usage:');
    console.log('  modelstats update [input] [output] [model]  - 更新统计数据（输入 token 数 输出 token 数 模型名）');
    console.log('  modelstats session [input] [output]          - 更新会话上下文 token（实时更新上下文占用）');
    console.log('  modelstats skill <name>                      - 设置当前使用的 Skill');
    console.log('  modelstats agent <name>                      - 设置正在调用的 Agent');
    console.log('  modelstats show                              - 查看当前统计');
    console.log('  modelstats reset                             - 重置所有统计');
    console.log('  modelstats clear                             - 清除当前 Skill/Agent');
    console.log('');
    console.log('Examples:');
    console.log('  modelstats update 1000 500 Qwen3           # 添加一次调用，输入 1000 输出 500 tokens');
    console.log('  modelstats session 45000 1200              # 设置当前会话上下文为 45K 输入 +1.2K 输出');
    console.log('  modelstats skill code-reviewer             # 设置当前使用的 Skill');
    console.log('  modelstats agent planner                   # 设置正在调用的 Agent');
    console.log('  modelstats show                            # 查看详情');
    console.log('  modelstats reset                           # 重置');
}
