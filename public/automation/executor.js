// public/automation/executor.js

import { sendMissionUpdate } from './communication.js';
import { performClick, performType, performScroll, isSearchPrompt, buildSearchUrl, findBestLink } from './interactions.js';

export async function executeMissionSteps(tabId, missionId, steps, context) {
    const { actionDelayMs, charDelay } = context;

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        try {
            await sendMissionUpdate(missionId, { event: 'step_started', stepIndex: i, data: { detail: `Starting ${step.type}: ${step.description}` } });

            const success = await processStep(tabId, missionId, i, step, context);

            if (success) {
                await sendMissionUpdate(missionId, { event: 'step_completed', stepIndex: i, data: { detail: `Completed ${step.type}` } });
            } else {
                await handleStepFailure(tabId, missionId, i, step, context);
            }
        } catch (e) {
            await sendMissionUpdate(missionId, { event: 'step_failed', stepIndex: i, data: { error: String(e) } });
        }
        await new Promise(res => setTimeout(res, actionDelayMs));
    }
}

async function processStep(tabId, missionId, index, step, context) {
    const { prompt, charDelay, captureTabSnapshot, contextualSurveyAwareness } = context;

    if (step.type === 'navigate') {
        return await handleNavigateStep(tabId, step, context);
    }
    if (step.type === 'click') {
        return await performClick(tabId, step.target || 'button, input[type=submit], a');
    }
    if (step.type === 'type') {
        return await performType(tabId, step.target || 'input, textarea', step.value || '', charDelay);
    }
    if (step.type === 'wait') {
        await new Promise(res => setTimeout(res, 1000));
        return true;
    }
    if (step.type === 'scroll') {
        return await performScroll(tabId);
    }

    return await handleHeuristicFallback(tabId, missionId, index, context);
}

async function handleNavigateStep(tabId, step, context) {
    const { prompt, currentUrl } = context;

    if (step.value) {
        await chrome.tabs.update(tabId, { url: step.value });
        return true;
    }
    if (isSearchPrompt(prompt)) {
        const searchUrl = buildSearchUrl(prompt);
        try { await chrome.tabs.update(tabId, { url: searchUrl }); return true; } catch (e) { return false; }
    }

    const best = await findBestLink(tabId, currentUrl || '');
    if (best) {
        try { await chrome.tabs.update(tabId, { url: best }); return true; } catch (e) { return false; }
    }

    return await performScroll(tabId);
}

async function handleHeuristicFallback(tabId, missionId, index, context) {
    const { captureTabSnapshot, contextualSurveyAwareness } = context;
    const snapshot = await captureTabSnapshot(tabId);
    const ctx = contextualSurveyAwareness(snapshot?.text || '');

    await sendMissionUpdate(missionId, { event: 'heuristic_action', stepIndex: index, data: { detail: ctx.reasoning, action: ctx.action } });
    const action = ctx.action.toLowerCase();
    const selector = ctx.parameters?.selector;
    const value = ctx.parameters?.value;

    if (action === 'click') return await performClick(tabId, selector || 'button, input[type="submit"], a');
    if (action === 'navigate') {
        if (value) { await chrome.tabs.update(tabId, { url: value }); return true; }
        return await performScroll(tabId);
    }
    if (action === 'type') return await performType(tabId, selector || 'input, textarea', value || '');
    if (action === 'scroll') return await performScroll(tabId);

    return false;
}

async function handleStepFailure(tabId, missionId, index, step, context) {
    await sendMissionUpdate(missionId, { event: 'step_failed', stepIndex: index, data: { error: 'action_failed' } });

    const attempts = Math.max(1, step.maxRetries || 1);
    for (let attempt = 1; attempt <= attempts; attempt++) {
        const backoff = 700 * Math.pow(2, attempt - 1);
        await sendMissionUpdate(missionId, { event: 'step_retry', stepIndex: index, data: { detail: `Retry attempt ${attempt} in ${backoff}ms` } });
        await new Promise(res => setTimeout(res, backoff));

        let retryOk = false;
        if (step.type === 'click') retryOk = await performClick(tabId, step.target || 'button, input[type=submit], a');
        else if (step.type === 'type') retryOk = await performType(tabId, step.target || 'input, textarea', step.value || '');
        else if (step.type === 'navigate' && step.value) { await chrome.tabs.update(tabId, { url: step.value }); retryOk = true; }

        if (retryOk) {
            await sendMissionUpdate(missionId, { event: 'step_completed', stepIndex: index, data: { detail: 'Completed on retry' } });
            return;
        }
    }

    await sendMissionUpdate(missionId, { event: 'step_failed', stepIndex: index, data: { error: 'retry_failed' } });
}

