#!/usr/bin/env node
/**
 * Hook handler for CC_Working_Env - Processes hook calls from Claude Code
 */

import { handleCostTrackerHook, handleSkillUsage, handleAgentCall, clearCurrentContext } from './auto-track.js';

/***
 * Type definitions for hook data
 */
interface HookData {
    [key: string]: number | string | undefined;
    skill_name?: string;
    agent_name?: string;
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
    model?: string;
    agent_type?: string;
}

// Supported hook types
const HOOK_HANDLERS: Record<string, (data: HookData) => void> = {
    /** Process API call token usage */
    'cost-tracker': (data: HookData) => {
        const payload = data || {};

        // Default missing values
        const input = typeof payload.input_tokens === 'number' ? payload.input_tokens : 0;
        const output = typeof payload.output_tokens === 'number' ? payload.output_tokens : 0;
        const cacheRead = typeof payload.cache_read_input_tokens === 'number' ? payload.cache_read_input_tokens : 0;
        const cacheCreation = typeof payload.cache_creation_input_tokens === 'number' ? payload.cache_creation_input_tokens : 0;
        const model = payload.model;

        // Update statistics
        handleCostTrackerHook({
            input_tokens: input,
            output_tokens: output,
            cache_read_input_tokens: cacheRead,
            cache_creation_input_tokens: cacheCreation,
            model: model
        });
    },

    /** Track Skill usage */
    'skill': (data: HookData) => {
        let skillName = data.skill_name || undefined;

        // Extract skill from raw data
        if (!skillName && data) {
            skillName = extractSkillFromData(data);
        }

        // Update skill tracking
        if (skillName) {
            handleSkillUsage(skillName);
        }
    },

    /** Track Agent usage */
    'agent': (data: HookData) => {
        let agentName = data.agent_name || data.agent_type || undefined;

        // Extract agent from raw data
        if (!agentName && data) {
            agentName = extractAgentFromData(data);
        }

        // Update Agent tracking
        if (agentName) {
            handleAgentCall(agentName);
        }
    },

    /** Clear current context */
    'session-end': () => {
        clearCurrentContext();
    }
};

/**
 * Extract Skill name from hook data string
 */
function extractSkillFromData(data: HookData | string): string {
    // Handle string data
    if (typeof data === 'string') {
        // Look for patterns like "/skill-name" or "using skill foo"
        const skillMatch = data.match(/^\/(\w+)$/) || data.match(/(?:use|run|call)\s+(?:the\s+)?(\w+)(?:\s+skill)?/i);
        return skillMatch ? skillMatch[1] : data;
    }

    // Pass through existing skill
    return data.skill_name || 'unknown';
}

/**
 * Extract Agent name from hook data
 */
function extractAgentFromData(data: HookData | string): string {
    // Handle string data
    if (typeof data === 'string') {
        const agentMatch = data.match(/agent:\s*(\w+)/i) || data.match(/(?:agent|Agent):?\s*([\w-]+)/i);
        return agentMatch ? agentMatch[1] : data;
    }

    // Handle object data
    return data.agent_name || data.agent_type || 'unknown';
}

/**
 * Parse hook arguments into structured data
 */
function parseHookData(args: string[]): HookData {
    let data: HookData = {};
    const dataArgs = args.filter(arg => !arg.startsWith('--'));

    // Try JSON parsing first
    if (dataArgs.length > 0) {
        try {
            const json = dataArgs.join(' ');
            data = JSON.parse(json);
        } catch {
            // Manual fallback parsing
            for (const arg of args) {
                if (arg.includes('=')) {
                    const [key, val] = arg.split('=');
                    if (!isNaN(parseInt(val, 10))) {
                        data[key] = parseInt(val, 10);
                    } else {
                        data[key] = val;
                    }
                }
            }
        }
    }

    return data;
}

/**
 * Main hook handler
 */
function main() {
    // Parse command line
    const args = process.argv.slice(2);
    let hookType: string | undefined;

    // Extract hook type (e.g., --hook=cost-tracker)
    const hookArg = args.find(arg => arg.startsWith('--hook='));
    if (hookArg) {
        hookType = hookArg.substring('--hook='.length);
    }

    // Validate hook
    if (!hookType) {
        console.error('[hooks] Usage: hook-handler.js --hook=<hook-type> [hook-data]');
        console.error('Supported hooks: cost-tracker, skill, agent, session-end');
        process.exit(1);
    }

    // Parse hook data
    const hookData = parseHookData(args);

    // Dispatch to handler
    const handler = HOOK_HANDLERS[hookType];
    if (handler) {
        try {
            handler(hookData);
            console.log(`[hooks] Successfully processed ${hookType} hook`);
        } catch (error) {
            console.error(`[hooks] Error in ${hookType} handler:`, error);
            process.exit(2);
        }
    } else {
        console.error(`[hooks] Unknown hook: ${hookType}`);
        process.exit(3);
    }
}

// Run main handler
main();