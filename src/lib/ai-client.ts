/**
 * @fileOverview Direct Gemini API client for standalone extension execution.
 * Bypasses the Node.js server to perform AI planning and reasoning in-browser.
 */

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

export interface AIResponse {
    steps?: any[];
    reasoning?: string;
    action?: string;
    parameters?: any;
    confidence?: number;
    isGoalAchieved?: boolean;
    neuralLock?: any;
    tacticalUpdate?: {
        newSteps?: any[];
        shouldResetIndex?: boolean;
    };
}

/**
 * Utility to retrieve AI Key from available storage.
 */
export async function getAIKey(): Promise<string | null> {
    try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const res = await chrome.storage.local.get('ai_api_key') as any;
            if (res.ai_api_key) return String(res.ai_api_key);
        }
        return localStorage.getItem('ai_api_key');
    } catch (e) {
        console.warn('[AI-Client] Key retrieval failed:', e);
        return null;
    }
}

export async function getAutonomyEnabled(): Promise<boolean> {
    try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const res = await new Promise<any>((resolve) => chrome.storage.local.get(['ai_autonomy_enabled'], resolve));
            return !!res?.ai_autonomy_enabled;
        }
        return localStorage.getItem('ai_autonomy_enabled') === 'true';
    } catch (e) {
        return false;
    }
}

export async function callGemini(prompt: string, apiKey: string, systemInstruction?: string, maxRetries: number = 2, options?: { userInitiated?: boolean }): Promise<AIResponse> {
    if (!apiKey) {
        console.error('[AI-Client] Missing API Key');
        throw new Error("Gemini API Key is missing. Set it in the extension settings.");
    }

    const url = `${GEMINI_API_URL}?key=${apiKey}`;

    const payload = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            response_mime_type: "application/json",
            max_output_tokens: 4096,
            temperature: 0.2
        }
    };

    if (systemInstruction) {
        (payload as any).system_instruction = {
            parts: [{ text: systemInstruction }]
        };
    }

    console.log('[AI-Client] Initiating Gemini 3.0 Request...');

    // Safety: Respect an operator-configured autonomy guard. If autonomous AI
    // calls are disabled, require an explicit userInitiated flag or a one-time
    // session override (set by the UI when the operator confirms).
    try {
        const autonomyEnabled = await getAutonomyEnabled();

        // Short-lived UI override: set by the operator when approving a single
        // blocked AI call (expires quickly and is removed when consumed).
        let userOverrideValid = false;
        try {
            const ts = typeof sessionStorage !== 'undefined' ? Number(sessionStorage.getItem('ai_user_override_ts') || 0) : 0;
            if (ts && (Date.now() - ts) < 30_000) { // 30s window
                userOverrideValid = true;
                try { sessionStorage.removeItem('ai_user_override_ts'); } catch (e) { /* ignore */ }
            }
        } catch (e) { /* ignore */ }

        if (!autonomyEnabled && !options?.userInitiated && !userOverrideValid) {
            const err: any = new Error('Autonomous AI disabled. Operator approval required to perform this action.');
            err.name = 'AutonomyDisabledError';
            throw err;
        }
    } catch (e) {
        // If storage access fails, err on the side of safety and allow requests
        // to proceed rather than blocking everything.
        console.warn('[AI-Client] Autonomy check failed, proceeding:', e);
    }

    // Respect a global cooldown persisted in storage so multiple tabs/instances
    // don't immediately hammer the API after a 429. If a cooldown exists and is
    // still active, throw a RateLimitError with the remaining time.
    const getCooldown = async (): Promise<number | null> => {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const res = await new Promise<any>((resolve) => chrome.storage.local.get(['ai_rate_limit_cooldown'], resolve));
                const v = res?.ai_rate_limit_cooldown;
                return v ? Number(v) : null;
            }
            const v = localStorage.getItem('ai_rate_limit_cooldown');
            return v ? Number(v) : null;
        } catch (e) {
            return null;
        }
    };

    const setCooldown = async (untilMs: number) => {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ ai_rate_limit_cooldown: untilMs });
            } else {
                localStorage.setItem('ai_rate_limit_cooldown', String(untilMs));
            }
        } catch (e) { /* ignore */ }
    };

    const nowCooldown = await getCooldown();
    if (nowCooldown && Date.now() < nowCooldown) {
        const retryAfter = Math.ceil((nowCooldown - Date.now()) / 1000);
        const rateLimitErr = new Error(`Client-side AI rate limit in effect. Retry in ${retryAfter}s`) as any;
        rateLimitErr.name = 'RateLimitError';
        rateLimitErr.retryAfter = retryAfter;
        throw rateLimitErr;
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                // Try to obtain retry information from headers first
                const retryHeader = response.headers.get && response.headers.get('Retry-After');
                const errBody = await response.json().catch(() => ({}));
                console.error('[AI-Client] HTTP Error:', response.status, errBody, 'Retry-After:', retryHeader);

                const errMsg = errBody.error?.message || `Gemini API failure (${response.status})`;

                // Parse Retry-After header (seconds or HTTP-date)
                const parseRetryHeader = (h: string | null) => {
                    if (!h) return null;
                    const n = parseInt(h, 10);
                    if (!isNaN(n)) return n;
                    const d = Date.parse(h);
                    if (!isNaN(d)) return Math.max(0, Math.ceil((d - Date.now()) / 1000));
                    return null;
                };

                if (response.status === 429) {
                    let retryAfter = parseRetryHeader(retryHeader) || null;
                    if (!retryAfter) {
                        // Fallback to parsing message like "Please retry in 25.9s"
                        const match = (errMsg || '').match(/retry in ([\d\.]+)s/i);
                        retryAfter = match ? Math.ceil(parseFloat(match[1])) : 15; // default 15s
                    }

                    // Persist a global cooldown so other windows/tabs respect the server rate limit
                    const untilMs = Date.now() + (retryAfter * 1000);
                    await setCooldown(untilMs);
                    console.warn(`[AI-Client] Rate limited by server. Cooling down for ${retryAfter}s (until ${new Date(untilMs).toISOString()})`);

                    const rateLimitErr = new Error(errMsg) as any;
                    rateLimitErr.name = 'RateLimitError';
                    rateLimitErr.retryAfter = retryAfter;
                    throw rateLimitErr;
                }

                // Treat 503 as a transient error and retry with exponential backoff
                if (response.status === 503 && attempt < maxRetries) {
                    const waitMs = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s...
                    console.warn(`[AI-Client] Service unavailable (503). Retrying in ${waitMs}ms (${attempt + 1}/${maxRetries})`);
                    await new Promise(res => setTimeout(res, waitMs));
                    continue;
                }

                throw new Error(errMsg);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                console.error('[AI-Client] Empty response structure:', data);
                throw new Error("Empty response from AI");
            }

            return JSON.parse(text);
        } catch (e: any) {
            // Bubble through rate limit errors so higher layers can surface retryAfter information
            if (e.name === 'RateLimitError') throw e;
            // For other transient failures, retry a few times before giving up
            if (attempt < maxRetries) {
                const backoff = Math.pow(2, attempt + 1) * 1000;
                console.warn(`[AI-Client] Request failed (attempt ${attempt + 1}/${maxRetries}). Retrying in ${backoff}ms. Error:`, e?.message || e);
                await new Promise(res => setTimeout(res, backoff));
                continue;
            }

            console.error("[AI-Client] Execution Error:", e?.message || e);
            throw e;
        }
    }

    throw new Error('Gemini API: exhausted retries');
}

// Ported Prompts
export const AUTOMATION_SYSTEM_PROMPT = `You are an elite "Antigravity Browser Agent" (Gemini 3.0 Optimized). Your task is to generate a granular, tactical mission plan.

**AGENTIC REASONING PROTOCOL (ANTIGRAVITY STANDARD):**
1. **RECURSIVE DISCOVERY:** If a goal is complex, start with discovery. Do not assume buttons exist; use 'extract' to find them. Navigate to root domains first.
2. **VERIFICATION MANDATORY:** Every action (click/type) MUST be followed by an 'extract' step to verify state change.
3. **TACTICAL PIVOTING:** Design your plan with failure in mind. If a target is missing, the plan should include alternative paths or discovery steps.
4. **MISSION INTEGRITY & SELECTORS:** Identify every clickable element relevant to the goal. You MUST provide highly specific, robust CSS selectors for all interactions. Avoid fragile structure-based selectors.
5. **THOUGHT VISIBILITY:** Your \`reasoning\` is displayed directly to the user as your "Thoughts". Make it concise, tactical, and explain the *why* of your current phase.

Return a JSON object:
{
    "steps": [{"description": string, "type": "go_to_url"|"navigate"|"click"|"type"|"scroll"|"touch"|"drag"|"extract"|"wait", "parameters"?: object}],
  "reasoning": string,
  "neuralLock": {"missionId"?: string, "confidence": number, "isAmbiguous": boolean}
    TOOLS (use these exact tool names and parameter schemas):
- go_to_url: { url: string } — Navigate the browser to a fully-qualified URL (include scheme, e.g. https://). Use when you know the exact URL to open.
- navigate: { value: string } — Resolve or search for a destination (fallback when exact URL unknown). The system may attempt to map brands to homepages.
- click: { selector: string } — Click the element matching the provided CSS selector.
- type: { selector: string, text: string } — Type text into an input or contentEditable element identified by selector.
- scroll: { direction?: 'down'|'up'|'left'|'right', amount?: number, unit?: 'px'|'vh'|'percent', behavior?: 'smooth'|'auto', to?: 'top'|'bottom' } — Scroll the viewport.
- touch: { selector?: string, x?: number, y?: number } — Simulate a touch/pointer at selector's center or coordinates.
- drag: { startSelector?: string, endSelector?: string, deltaX?: number, deltaY?: number, durationMs?: number } — Drag from start to end (selectors or delta).
- extract: { selector?: string, attribute?: string } — Extract text or attribute from the page.
- wait: { ms: number } — Pause for the given milliseconds.

Guidelines: Prefer go_to_url with full URLs for deterministic navigation. Return only the allowed tool names above in your type field and provide a parameters object matching the tool schema.
}`;

export const SURVEY_SYSTEM_PROMPT = `You are a high-autonomy "Antigravity Browser Agent" (Gemini 3.0). 
You are observing the current environment to determine the next tactical move.

**REFLECTIVE AGENTIC RULES:**
1. **MISSION MEMORY:** Review execution history. If a step failed (e.g., element not found), DO NOT repeat it blindly. Propose a 'tacticalUpdate' to find a new path.
2. **TACTICAL PIVOTING:** If you realize the current plan is flawed based on 'surveyContent', use 'tacticalUpdate' to rewrite future steps.
3. **ROBUST SELECTORS:** When declaring 'CLICK' or 'TYPE', ensure the 'selector' parameter is highly specific (ID, unique class, name attribute). The UI will power a tactical cursor to this element, so it must be exact.
4. **THOUGHT VISIBILITY:** Your \`reasoning\` is shown to the user in their HUD. Speak directly, tactically, and explain the current evaluation.
5. **GOAL COMPLETION:** Look for definitive visual evidence (success banners, specific URLs) to mark isGoalAchieved=true.

TOOLS (use these exact tool names and parameter schemas):
- go_to_url: { url: string } — Navigate the browser to a fully-qualified URL (include scheme, e.g. https://). Use when you know the exact URL to open.
- navigate: { value: string } — Resolve or search for a destination (fallback when exact URL unknown).
- click: { selector: string } — Click the element matching the provided CSS selector.
- type: { selector: string, text: string } — Type text into an input or contentEditable element identified by selector.
- scroll: { direction?: 'down'|'up'|'left'|'right', amount?: number, unit?: 'px'|'vh'|'percent', behavior?: 'smooth'|'auto', to?: 'top'|'bottom' } — Scroll the viewport.
- touch: { selector?: string, x?: number, y?: number } — Simulate a touch/pointer at selector's center or coordinates.
- drag: { startSelector?: string, endSelector?: string, deltaX?: number, deltaY?: number, durationMs?: number } — Drag from start to end (selectors or delta).
- extract: { selector?: string, attribute?: string } — Extract text or attribute from the page.
- wait: { ms: number } — Pause for the given milliseconds.

Guidelines: Prefer go_to_url with full URLs for deterministic navigation. Return only the allowed tool names above in your action field and provide a parameters object matching the tool schema.

Return a JSON object:
{
    "action": "go_to_url"|"navigate"|"click"|"type"|"scroll"|"touch"|"drag"|"wait"|"ask-user",
    "parameters": { /* tool-specific parameters, e.g. { url }, { selector, text }, { direction, amount } */ },
  "reasoning": string,
  "confidence": number,
  "isGoalAchieved": boolean,
  "tacticalUpdate": {
    "newSteps": [{"description": string, "type": string, "target"?: string, "value"?: string}],
    "shouldResetIndex": boolean
  }
}`;
