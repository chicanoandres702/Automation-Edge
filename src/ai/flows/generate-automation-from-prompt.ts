'use server';
/**
 * @fileOverview This file implements an agentic Genkit flow using Gemini 3.0 Flash
 * to interpret natural language prompts and generate a high-fidelity browser automation workflow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAutomationFromPromptInputSchema = z.object({
  prompt: z.string().describe('A natural language description of the desired browser automation task.'),
  missionContext: z.string().optional().describe('Specific Mission/Course ID (e.g. SWK-2400).'),
  platformContext: z.string().optional().describe('Broader Platform ID (e.g. Google Docs, Capella).'),
});
export type GenerateAutomationFromPromptInput = z.infer<
  typeof GenerateAutomationFromPromptInputSchema
>;

const GenerateAutomationFromPromptOutputSchema = z
  .object({
    workflowSteps: z
      .array(z.string())
      .describe('An array of steps describing the browser automation workflow.'),
    reasoning: z.string().describe('The AI reasoning for the chosen multi-step plan.'),
    estimatedRisk: z.enum(['low', 'medium', 'high']).describe('Risk level for disqualification or detection.'),
  })
  .describe('The generated browser automation workflow.');
export type GenerateAutomationFromPromptOutput = z.infer<
  typeof GenerateAutomationFromPromptOutputSchema
>;

export async function generateAutomationFromPrompt(
  input: GenerateAutomationFromPromptInput
): Promise<GenerateAutomationFromPromptOutput> {
  return generateAutomationFromPromptFlow(input);
}

const automationPrompt = ai.definePrompt({
  name: 'generateAutomationPrompt',
  input: {schema: GenerateAutomationFromPromptInputSchema},
  output: {schema: GenerateAutomationFromPromptOutputSchema},
  prompt: `You are an elite AI Browser Agent. Your objective is to translate user requests into a high-fidelity sequence of operations.

### CONTEXT STRATEGY:
{{#if platformContext}}**Shared Platform/Tool: {{{platformContext}}}**
- This is a universal tool (e.g., Google Docs, M365, Library). 
- Use your persistent knowledge of this tool's infrastructure. 
- Actions here should be consistent with how this tool is used across any project.{{/if}}

{{#if missionContext}}**Mission Context: {{{missionContext}}}**
- This is a specific mission (e.g., Course SWK-2400).
- Maintain **Progressive Continuity**: Logic from previous weeks/tasks within this ID should be leveraged as a foundation.
- Maintain **Isolation**: Do NOT use data or rubrics from UNRELATED missions.{{/if}}

### OPERATIONAL GUIDELINES:
1. **Unrestricted Execution**: Include login, extraction, and submission. 
2. **Autonomous Security**: Solve CAPTCHAs or security verifications autonomously using vision. Do not pause for human help.
3. **Multi-Tab Coordination**: Orchestrate actions across multiple sites.
4. **Resilience**: Plan for verification steps to confirm successful interactions.

User Objective: {{{prompt}}}

Generate the high-fidelity mission plan.`,
});

const generateAutomationFromPromptFlow = ai.defineFlow(
  {
    name: 'generateAutomationFromPromptFlow',
    inputSchema: GenerateAutomationFromPromptInputSchema,
    outputSchema: GenerateAutomationFromPromptOutputSchema,
  },
  async input => {
    const {output} = await automationPrompt(input);
    return output!;
  }
);
