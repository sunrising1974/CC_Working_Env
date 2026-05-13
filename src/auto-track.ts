#!/usr/bin/env node
/**
 * Auto-stats hook - Automatically update stats after Claude API calls
 *
 * This module provides hook handlers for:
 * - API call token tracking
 * - Skill usage tracking
 * - Agent invocation tracking
 */

import * as fs from 'fs';
import * as path from 'path';

// Hook configuration
const config = {
    // Enable/disable auto-tracking
    enabled: true,

    // Log verbose output
    verbose: false,
};

// Import stats handling functions
import { loadStats, saveStats } from './index.js';

interface TokenUsage {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheCreation?: number;
}

interface CostTrackerPayload {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
    model?: string;
    web_search_rpm?: number;
}

/**
 * Parse token usage from server response
 */
export function parseTokenUsage(responseData: any): TokenUsage {
    const result: TokenUsage = {};

    try {
        if (responseData && typeof responseData === 'object') {
            // Claude API response format
            if (responseData.usage) {
                result.input = responseData.usage.input_tokens;
                result.output = responseData.usage.output_tokens;
                result.cacheRead = responseData.usage.cache_read_input_tokens;
                result.cacheCreation = responseData.usage.cache_creation_input_tokens;
            }
            // Hook data format
            else if (responseData.input_tokens !== undefined && responseData.output_tokens !== undefined) {
                result.input = responseData.input_tokens;
                result.output = responseData.output_tokens;
                result.cacheRead = responseData.cache_read_input_tokens;
                result.cacheCreation = responseData.cache_creation_input_tokens;
            }
        }
    } catch (error) {
        console.error('[autotrack] Error parsing token usage:', error);
    }

    return result;
}

/**
 * Update stats with new API call data
 */
export function handleApiCall(inputTokens?: number, outputTokens?: number, model?: string): void {
    if (!config.enabled) return;

    try {
        const stats = loadStats();

        // Increment call count
        stats.callCount += 1;

        // Add token usage
        stats.totalTokens += (inputTokens || 0) + (outputTokens || 0);
        stats.sessionInputTokens += inputTokens || 0;
        stats.sessionOutputTokens += outputTokens || 0;

        // Update current model
        if (model) {
            stats.currentModel = model;
        }

        saveStats(stats);

        if (config.verbose) {
            const displayTokens = ((inputTokens || 0) + (outputTokens || 0));
            console.log(`[modelstats] API call: ${displayTokens} tokens (${inputTokens || 0} in + ${outputTokens || 0} out)`);
            if (model) {
                console.log(`             Model: ${model}`);
            }
        }
    } catch (error) {
        console.error('[autotrack] Error updating stats:', error);
    }
}

/**
 * Track Skill usage
 */
export function handleSkillUsage(skillName: string): void {
    if (!config.enabled) return;

    try {
        const stats = loadStats();
        stats.currentSkill = skillName;
        saveStats(stats);

        // Track usage count in session state
        const sessionState = loadSessionState();
        sessionState.skillUsage[skillName] = (sessionState.skillUsage[skillName] || 0) + 1;
        saveSessionState(sessionState);

        if (config.verbose) {
            console.log(`[modelstats] Active Skill: ${skillName}`);
        }
    } catch (error) {
        console.error('[autotrack] Error updating skill:', error);
    }
}

/**
 * Track Agent call
 */
export function handleAgentCall(agentName: string): void {
    if (!config.enabled) return;

    try {
        const stats = loadStats();
        stats.currentAgent = agentName;
        saveStats(stats);

        // Track usage count in session state
        const sessionState = loadSessionState();
        sessionState.agentUsage[agentName] = (sessionState.agentUsage[agentName] || 0) + 1;
        saveSessionState(sessionState);

        if (config.verbose) {
            console.log(`[modelstats] Active Agent: ${agentName}`);
        }
    } catch (error) {
        console.error('[autotrack] Error updating agent:', error);
    }
}

/**
 * Handle cost-tracker hook data
 */
export function handleCostTrackerHook(payload: CostTrackerPayload): void {
    if (!config.enabled) return;

    // Extract data from hook payload
    const input = payload.input_tokens || 0;
    const output = payload.output_tokens || 0;
    const cacheRead = payload.cache_read_input_tokens || 0;
    const cacheCreation = payload.cache_creation_input_tokens || 0;
    const model = payload.model;

    // Update token usage statistics
    handleApiCall(input, output, model);

    if (config.verbose && (input > 0 || output > 0)) {
        const total = input + output;
        const cacheTotal = cacheRead + cacheCreation;
        console.log(`[modelstats] Tokens: ${total} (${input} in + ${output} out)`);
        if (cacheTotal > 0) {
            console.log(`             Cache: ${cacheTotal} tokens`);
        }
        if (model) {
            console.log(`             Model: ${model}`);
        }
    }
}

/**
 * Reset current Skill and Agent
 */
export function clearCurrentContext(): void {
    if (!config.enabled) return;

    try {
        const stats = loadStats();
        stats.currentSkill = undefined;
        stats.currentAgent = undefined;
        saveStats(stats);

        if (config.verbose) {
            console.log('[modelstats] Cleared current context');
        }
    } catch (error) {
        console.error('[autotrack] Error clearing context:', error);
    }
}

/**
 * Load session state with error handling
 */
function loadSessionState(): {
    currentSkill?: string;
    currentAgent?: string;
    skillUsage: Record<string, number>;
    agentUsage: Record<string, number>;
} {
    try {
        const sessionFile = path.join(
            process.env.CLAUDE_CONFIG_DIR || path.join(process.env.HOME || '', '.claude'),
            'modelstats-session.json'
        );

        if (fs.existsSync(sessionFile)) {
            const data = fs.readFileSync(sessionFile, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('[autotrack] Error loading session state:', error);
    }

    return {
        currentSkill: undefined,
        currentAgent: undefined,
        skillUsage: {},
        agentUsage: {},
    };
}

/**
 * Save updated session state
 */
function saveSessionState(state: {
    currentSkill?: string;
    currentAgent?: string;
    skillUsage: Record<string, number>;
    agentUsage: Record<string, number>;
}): void {
    try {
        state = state || {};
        const sessionFile = path.join(
            process.env.CLAUDE_CONFIG_DIR || path.join(process.env.HOME || '', '.claude'),
            'modelstats-session.json'
        );
        const sessionDir = path.dirname(sessionFile);

        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        fs.writeFileSync(sessionFile, JSON.stringify(state, null, 2), 'utf-8');
    } catch (error) {
        console.error('[autotrack] Error saving session state:', error);
    }
}

// Register hooks when module is loaded
if (config.enabled && config.verbose) {
    console.log('[modelstats] Auto-tracking module initialized and ready for hook calls');
}

// Export handlers
export default {
    config,
    parseTokenUsage,
    handleApiCall,
    handleSkillUsage,
    handleAgentCall,
    handleCostTrackerHook,
    clearCurrentContext,
};