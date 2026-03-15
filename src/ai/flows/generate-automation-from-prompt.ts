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
  platformContext: z.string().optional().describe('Broader Platform ID (e.g. Capella).'),
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

### Context Strategy:
{{#if platformContext}}Platform: {{{platformContext}}}. Use knowledge of universal platform tools (Library, Microsoft 365) that are shared across all courses.{{/if}}
{{#if missionContext}}Mission: {{{missionContext}}}. Maintain progressive continuity (e.g. Week 2 building on Week 1) and isolate assignment-specific data from other courses.{{/if}}

### Strategy Guidelines:
1. **Unrestricted Execution**: Include login, extraction, and submission. 
2. **Autonomous Security**: Include steps to identify and solve CAPTCHAs or security verifications autonomously using vision.
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