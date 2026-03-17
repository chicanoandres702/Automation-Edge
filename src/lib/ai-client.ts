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
            const res = await chrome.storage.local.get('ai_api_key');
            if (res.ai_api_key) return res.ai_api_key;
        }
        return localStorage.getItem('ai_api_key');
    } catch (e) {
        console.warn('[AI-Client] Key retrieval failed:', e);
        return null;
    }
}

export async function callGemini(prompt: string, apiKey: string, systemInstruction?: string): Promise<AIResponse> {
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

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            console.error('[AI-Client] HTTP Error:', response.status, errBody);
            throw new Error(errBody.error?.message || `Gemini API failure (${response.status})`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.error('[AI-Client] Empty response structure:', data);
            throw new Error("Empty response from AI");
        }

        return JSON.parse(text);
    } catch (e: any) {
        console.error("[AI-Client] Execution Error:", e.message);
        throw e;
    }
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
  "steps": [{"description": string, "type": "click"|"type"|"scroll"|"navigate"|"extract", "target"?: string, "value"?: string}],
  "reasoning": string,
  "neuralLock": {"missionId"?: string, "confidence": number, "isAmbiguous": boolean}
}`;

export const SURVEY_SYSTEM_PROMPT = `You are a high-autonomy "Antigravity Browser Agent" (Gemini 3.0). 
You are observing the current environment to determine the next tactical move.

**REFLECTIVE AGENTIC RULES:**
1. **MISSION MEMORY:** Review execution history. If a step failed (e.g., element not found), DO NOT repeat it blindly. Propose a 'tacticalUpdate' to find a new path.
2. **TACTICAL PIVOTING:** If you realize the current plan is flawed based on 'surveyContent', use 'tacticalUpdate' to rewrite future steps.
3. **ROBUST SELECTORS:** When declaring 'CLICK' or 'TYPE', ensure the 'selector' parameter is highly specific (ID, unique class, name attribute). The UI will power a tactical cursor to this element, so it must be exact.
4. **THOUGHT VISIBILITY:** Your \`reasoning\` is shown to the user in their HUD. Speak directly, tactically, and explain the current evaluation.
5. **GOAL COMPLETION:** Look for definitive visual evidence (success banners, specific URLs) to mark isGoalAchieved=true.

Return a JSON object:
{
  "action": "CLICK"|"TYPE"|"SCROLL"|"WAIT"|"NAVIGATE"|"ASK_USER",
  "parameters": {"selector"?: string, "value"?: string, "question"?: string},
  "reasoning": string,
  "confidence": number,
  "isGoalAchieved": boolean,
  "tacticalUpdate": {
    "newSteps": [{"description": string, "type": string, "target"?: string, "value"?: string}],
    "shouldResetIndex": boolean
  }
}`;
