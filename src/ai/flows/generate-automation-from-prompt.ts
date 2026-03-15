
'use server';
/**
 * @fileOverview This flow interprets natural language prompts and generates mission plans.
 * Specifically handles universal tool classification for persistent shared knowledge.
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
  })).describe('Classification of any mentioned websites for context isolation.'),
});

export type GenerateAutomationFromPromptOutput = z.infer<typeof GenerateAutomationFromPromptOutputSchema>;

const automationPrompt = ai.definePrompt({
  name: 'generateAutomationPrompt',
  input: { schema: GenerateAutomationFromPromptInputSchema },
  output: { schema: GenerateAutomationFromPromptOutputSchema },
  prompt: `You are an elite AI Browser Agent. 

### CONTEXT PERSISTENCE & CLASSIFICATION
1. **Tool vs. Mission**: Identify if any website involved is a "Shared Tool" (e.g., Google Docs, Microsoft 365, VitalSource) vs a "Mission Specific" project site (e.g., Capella Course Page, Course SWK-2400).
   - If a site is a universal platform tool, mark it as 'shared_tool'.
   - If a site is specific to a course or temporary project, mark it as 'mission_specific'.
2. **Progressive Continuity**: If a mission ID is detected (like a course code SWK-2400), assume tasks building upon each other.
3. **Tool Hostname Detection**: For shared tools, provide the root hostname (e.g. docs.google.com).

User Objective: {{{prompt}}}

{{#if sharedToolHostnames}}
Existing Classified Shared Tools:
{{#each sharedToolHostnames}}
- {{{this}}}
{{/each}}
{{/if}}

Generate the tactical workflow steps and accurately classify any platforms involved for proper context siloing.`,
});

export async function generateAutomationFromPrompt(input: GenerateAutomationFromPromptInput): Promise<GenerateAutomationFromPromptOutput> {
  const { output } = await automationPrompt(input);
  return output!;
}
