'use server';
/**
 * @fileOverview This flow interprets natural language prompts and generates mission plans.
 * Specifically handles Neural Lock classification for context isolation.
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
    confidence: z.number().describe('How certain we are of the mission ID.'),
    reason: z.string().describe('Why this ID was chosen.'),
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

### NEURAL LOCK & CLASSIFICATION
1. **Identify Mission Context**: Look for course codes (e.g., SWK-2400), project names, or specific class identifiers. This is the "Neural Lock."
2. **Platform Tiering**: 
   - **Shared Tool**: Universal platforms (Google Docs, Microsoft 365, VitalSource, Yellowdig). Mark these 'shared_tool'.
   - **Mission Specific**: Project-specific URLs or portals (Capella Courseroom, specific course dashboards). Mark these 'mission_specific'.

User Objective: {{{prompt}}}

{{#if missionContext}}
Current Active Lock: {{{missionContext}}}
{{/if}}

{{#if sharedToolHostnames}}
Known Shared Tools:
{{#each sharedToolHostnames}}
- {{{this}}}
{{/each}}
{{/if}}

Generate the tactical workflow and establish the Neural Lock.`,
});

export async function generateAutomationFromPrompt(input: GenerateAutomationFromPromptInput): Promise<GenerateAutomationFromPromptOutput> {
  const { output } = await automationPrompt(input);
  return output!;
}
