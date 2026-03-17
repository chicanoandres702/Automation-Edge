'use server';
/**
 * @fileOverview This flow interprets natural language prompts and generates mission plans.
 * Specifically handles Neural Lock classification and discovery of ambiguous contexts.
 * Updated to support exhaustive "Complete All" discovery logic.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateAutomationFromPromptInputSchema = z.object({
  prompt: z.string().describe('The user objective.'),
  missionContext: z.string().optional().describe('Optional manual Mission ID.'),
  sharedToolHostnames: z.array(z.string()).optional().describe('List of existing shared tool hostnames.'),
});

export type GenerateAutomationFromPromptInput = z.infer<typeof GenerateAutomationFromPromptInputSchema>;

const GenerateAutomationFromPromptOutputSchema = z.object({
  steps: z.array(z.object({
    description: z.string().describe('Human readable description of the step.'),
    type: z.enum(['click', 'type', 'scroll', 'navigate', 'wait', 'extract', 'ask-user', 'refresh']).describe('The logical action to perform.'),
    target: z.string().optional().describe('CSS selector or XPath if the action requires a target.'),
    value: z.string().optional().describe('Text to type or URL to navigate to.'),
    maxRetries: z.number().optional().default(3).describe('Maximum retry attempts for this node.')
  })).describe('Structured workflow steps for the browser agent.'),
  reasoning: z.string(),
  // ... (keeping other fields for compatibility)
  estimatedRisk: z.enum(['low', 'medium', 'high']),
  neuralLock: z.object({
    missionId: z.string().optional().describe('Extracted identifier (e.g., SWK-2400) if found.'),
    confidence: z.number().describe('How certain we are of the mission ID (0.0 to 1.0).'),
    reason: z.string().describe('Why this ID was chosen or why it is missing.'),
    isAmbiguous: z.boolean().describe('True if the platform is known but the specific mission (class) is unclear.'),
  }),
  classifiedPlatforms: z.array(z.object({
    hostname: z.string(),
    type: z.enum(['shared_tool', 'mission_specific']),
    reason: z.string()
  })).describe('Classification of websites for context siloing.'),
});

export type GenerateAutomationFromPromptOutput = z.infer<typeof GenerateAutomationFromPromptOutputSchema>;

const automationPrompt = ai.definePrompt({
  name: 'generateAutomationPrompt',
  input: { schema: GenerateAutomationFromPromptInputSchema },
  output: { schema: GenerateAutomationFromPromptOutputSchema },
  prompt: `You are the elite "Antigravity Browser Agent". Your task is to generate a granular, tactical mission plan that executes seamlessly in the user's browser.

**STRICT ARCHITECTURAL RULES (ANTIGRAVITY STANDARD):**
1.  **NO BOILERPLATE:** Never use generic "Survey" or "Inventory" strings unless they are strictly necessary for a broad discovery goal.
2.  **BLACK-LISTED SEQUENCE:** Do not use the sequence "Navigate to Dashboard" -> "Survey for All Pending Tasks" -> "Inventory Assignments" or anything similar.
3.  **NO GUESSED URLS:** Never guess deep-links (e.g., /dashboard). Navigate to the domain root and use 'extract' + 'click' to discover the correct path via the UI.
4.  **VERIFICATION MANDATORY:** Every primary action (navigate, click, type) MUST be followed by a verification step (type: 'extract') to confirm the expected state changed or the target element appeared.
5.  **SPECIFICITY & SELECTORS:** Provide highly specific, robust CSS selectors for 'click' and 'type' actions. Avoid fragile nth-child selectors; prefer IDs, unique classes, or data attributes.
6.  **ACTION TYPES:** Use 'click', 'type', 'extract', 'navigate' with surgical precision.
7.  **CHAIN OF THOUGHT:** In your \`reasoning\`, explain *why* these steps are the optimal path. This reasoning will be displayed directly to the user in their HUD as your "Thoughts".

**THINKING PROCESS & EXAMPLES:**
- **Goal: "Login to Google"** 
  -> [navigate (google.com)] -> [extract (login field)] -> [type (email)] -> [click (next)] -> [extract (password field)] -> [type (password)] -> [click (signin)] -> [extract (inbox)].
- **Goal: "Complete SWK-2400 Assignment"**
  -> [navigate (portal root)] -> [extract (dashboard link)] -> [click (dashboard)] -> [extract (course links)] -> [click (SWK-2400)] -> [extract (assignment requirements)] -> [click (open editor)] -> [extract (editor state)].
- **Goal: "Search for Shoes"** 
  -> [navigate (shop)] -> [extract (search box)] -> [type (shoes)] -> [click (search button)] -> [extract (result items)].

**USER OBJECTIVE:**
{{{prompt}}}

{{#if missionContext}}
**Current Active Lock:** {{{missionContext}}}
{{/if}}

Generate the structured mission plans. NO GUESSED URLS. EVERY STEP VERIFIED. Be surgically precise.`,
});

export async function generateAutomationFromPrompt(input: GenerateAutomationFromPromptInput): Promise<GenerateAutomationFromPromptOutput> {
  const { output } = await automationPrompt(input);
  return output!;
}
