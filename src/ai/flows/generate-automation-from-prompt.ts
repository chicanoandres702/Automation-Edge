'use server';
/**
 * @fileOverview This flow interprets natural language prompts and generates mission plans.
 * Specifically handles Neural Lock classification and discovery of ambiguous contexts.
 * Updated to support exhaustive "Complete All" discovery logic.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAutomationFromPromptInputSchema = z.object({
  prompt: z.string().describe('The user objective.'),
  missionContext: z.string().optional().describe('Optional manual Mission ID.'),
  sharedToolHostnames: z.array(z.string()).optional().describe('List of existing shared tool hostnames.'),
});

export type GenerateAutomationFromPromptInput = z.infer<typeof GenerateAutomationFromPromptInputSchema>;

const GenerateAutomationFromPromptOutputSchema = z.object({
  workflowSteps: z.array(z.string()),
  reasoning: z.string(),
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
  prompt: `You are an elite AI Browser Agent specializing in Academic and Professional automation.

### NEURAL LOCK & EXHAUSTIVE DISCOVERY
1. **Exhaustive Mode**: If the user prompt is broad (e.g., "Complete all homework", "Finish assignments"), your FIRST steps MUST be:
   - "Navigate to Dashboard"
   - "Survey for All Pending Tasks"
   - "Inventory Assignments"
2. **Identify Mission Context**: Look for course codes (e.g., SWK-2400) or project names.
3. **Handle Ambiguity**: If the specific mission is unclear, set isAmbiguous to true. Prioritize "Discovery" steps to find the active course.
4. **Platform Tiering**: 
   - **Shared Tool**: Universal platforms (Google Docs, Microsoft 365, VitalSource). Mark 'shared_tool'.
   - **Mission Specific**: Project-specific portals (Capella Courseroom). Mark 'mission_specific'.

User Objective: {{{prompt}}}

{{#if missionContext}}
Current Active Lock: {{{missionContext}}}
{{/if}}

Generate a tactical workflow that ensures NO task is left behind. Use Discovery steps to build an internal inventory.`,
});

export async function generateAutomationFromPrompt(input: GenerateAutomationFromPromptInput): Promise<GenerateAutomationFromPromptOutput> {
  const { output } = await automationPrompt(input);
  return output!;
}
