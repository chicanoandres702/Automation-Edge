
'use server';
/**
 * @fileOverview This flow interprets natural language prompts and generates mission plans.
 * Now specifically looks for tool classification cues.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAutomationFromPromptInputSchema = z.object({
  prompt: z.string().describe('The user objective.'),
  missionContext: z.string().optional().describe('Mission ID (e.g. SWK-2400).'),
  platformContext: z.string().optional().describe('Shared tool ID (e.g. Google Docs).'),
  sharedToolHostnames: z.array(z.string()).optional().describe('List of hostnames already classified as shared tools.'),
});

export type GenerateAutomationFromPromptInput = z.infer<typeof GenerateAutomationFromPromptInputSchema>;

const GenerateAutomationFromPromptOutputSchema = z.object({
  workflowSteps: z.array(z.string()),
  reasoning: z.string(),
  estimatedRisk: z.enum(['low', 'medium', 'high']),
  classifiedPlatforms: z.array(z.object({
    hostname: z.string(),
    type: z.enum(['shared_tool', 'mission_specific']),
    reason: z.string()
  })).describe('Classification of any mentioned websites.'),
});

export type GenerateAutomationFromPromptOutput = z.infer<typeof GenerateAutomationFromPromptOutputSchema>;

const automationPrompt = ai.definePrompt({
  name: 'generateAutomationPrompt',
  input: { schema: GenerateAutomationFromPromptInputSchema },
  output: { schema: GenerateAutomationFromPromptOutputSchema },
  prompt: `You are an elite AI Browser Agent. 

### PERSISTENCE & CLASSIFICATION
1. **Shared Platform Detection**: Identify if any website involved is a universal tool (e.g., Google Docs, Office 365, Library). 
   - If a site is a tool, it should be marked as 'shared_tool'.
   - If it is specific to a project/course, mark as 'mission_specific'.
2. **Progressive Continuity**: If a mission ID is provided (e.g., {{{missionId}}}), assume logic from previous weeks in this context is foundational.

User Objective: {{{prompt}}}

{{#if sharedToolHostnames}}
Existing Shared Tools:
{{#each sharedToolHostnames}}
- {{{this}}}
{{/each}}
{{/if}}

Generate the mission plan and classify the involved platforms.`,
});

export async function generateAutomationFromPrompt(input: GenerateAutomationFromPromptInput): Promise<GenerateAutomationFromPromptOutput> {
  const { output } = await automationPrompt(input);
  return output!;
}
