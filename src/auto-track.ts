#!/usr/bin/env node

/**
 * Auto-stats hook - Automatically update stats after Claude API calls
 *
 * This hook can be configured in settings.json to automatically track
 * API usage, Skill usage, and Agent calls by parsing the response headers.
 */

import { loadStats, saveStats, updateStats, setCurrentSkill, setCurrentAgent } from './index.js';

// Hook configuration
const config = {
  // Enable/disable auto-tracking
  enabled: true,

  // Log verbose output
  verbose: false,
};

/**
 * Parse token usage from response headers or body
 */
function parseTokenUsage(headers: Record<string, string>, responseBody?: any): { input?: number; output?: number; total?: number } {
  const usage: { input?: number; output?: number; total?: number } = {};

  // Try to get from response body (Claude API format)
  if (responseBody && responseBody.usage) {
    usage.input = responseBody.usage.input_tokens || 0;
    usage.output = responseBody.usage.output_tokens || 0;
    usage.total = (usage.input || 0) + (usage.output || 0);
  }

  return usage;
}

/**
 * Extract Skill name from command/request
 */
function extractSkillFromCommand(command: string): string | undefined {
  // Pattern for /skill-name commands
  const skillMatch = command.match(/^\/(\w+)$/);
  if (skillMatch) {
    return skillMatch[1];
  }

  // Pattern for "Use <skill>" mentions
  const skillMention = command.match(/(?:use|run|call)\s+(?:the\s+)?(\w+)(?:\s+skill)?/i);
  if (skillMention) {
    return skillMention[1];
  }

  return undefined;
}

/**
 * Extract Agent name from request/tool call
 */
function extractAgentFromRequest(request: any): string | undefined {
  // Check for agent type in tool calls
  if (request.tool?.agent?.subagent_type) {
    return request.tool.agent.subagent_type;
  }

  // Check for Agent tool usage
  if (request.tool?.name === 'Agent') {
    const subagentType = request.tool.params?.subagent_type || request.tool.prompt?.match(/agent type[:\s]+(\w+)/)?.[1];
    return subagentType || 'agent';
  }

  return undefined;
}

/**
 * Handle a completed API call
 */
export function handleApiCall(inputTokens?: number, outputTokens?: number, model?: string): void {
  if (!config.enabled) {
    return;
  }

  const stats = updateStats(inputTokens, outputTokens, model);

  if (config.verbose) {
    const totalTokens = (inputTokens || 0) + (outputTokens || 0);
    console.log(`[modelstats] Updated: ${model || 'default'} | +${totalTokens} tokens | Total: ${stats.totalTokens} | Calls: ${stats.callCount}`);
  }
}

/**
 * Handle Skill usage
 */
export function handleSkillUsage(skillName: string): void {
  if (!config.enabled) {
    return;
  }

  const stats = setCurrentSkill(skillName);

  if (config.verbose) {
    console.log(`[modelstats] Skill active: ${skillName}`);
  }
}

/**
 * Handle Agent call
 */
export function handleAgentCall(agentName: string): void {
  if (!config.enabled) {
    return;
  }

  const stats = setCurrentAgent(agentName);

  if (config.verbose) {
    console.log(`[modelstats] Agent called: ${agentName}`);
  }
}

/**
 * Reset current Skill/Agent when session ends or changes
 */
export function clearCurrentContext(): void {
  const stats = loadStats();
  stats.currentSkill = undefined;
  stats.currentAgent = undefined;
  saveStats(stats);

  if (config.verbose) {
    console.log('[modelstats] Cleared current context');
  }
}

/**
 * Register hooks with Claude Code (if available)
 */
export function registerHooks(): void {
  console.log('[modelstats] Auto-tracking ready');
  console.log('[modelstats] Use handleSkillUsage() and handleAgentCall() to track activity');
}

// Export for use in hooks
export default {
  config,
  parseTokenUsage,
  handleApiCall,
  handleSkillUsage,
  handleAgentCall,
  clearCurrentContext,
  registerHooks,
};
