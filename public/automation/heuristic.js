// public/automation/heuristic.js

import { sendMissionUpdate } from './communication.js';
import { performClick, performType, performScroll, isSearchPrompt, buildSearchUrl, findBestLink, tryAutoFillForm } from './interactions.js';

export async function runHeuristicLoop(tabId, missionId, context) {
    const { actionDelayMs } = context;

    for (let iter = 0; iter < 8; iter++) {
        const snapshot = await context.captureTabSnapshot(tabId);
        if (snapshot.error) {
            await sendMissionUpdate(missionId, { event: 'mission_failed', data: { error: `Snapshot error: ${snapshot.error}` } });
            return false;
        }

        const ctx = context.contextualSurveyAwareness(snapshot?.text || '');
        await sendHeuristicUpdate(missionId, iter, ctx);

        if (ctx.isGoalAchieved || ctx.action.toUpperCase() === 'WAIT') {
            return await handleGoalAchieved(missionId, snapshot);
        }

        await executeHeuristicAction(tabId, missionId, ctx, context, snapshot);
        await new Promise(res => setTimeout(res, actionDelayMs));
    }

    return await handleTimeout(missionId);
}

async function sendHeuristicUpdate(missionId, iter, ctx) {
    console.log('[Background] Heuristic decision', ctx);
    try {
        await sendMissionUpdate(missionId, {
            event: 'heuristic_iteration',
            stepIndex: iter,
            data: { detail: ctx.reasoning, action: ctx.action }
        });
    } catch (e) { }
}

async function handleGoalAchieved(missionId, snapshot) {
    console.log('[Background] Goal achieved or waiting.');
    await chrome.storage.local.set({ lastMissionStatus: 'completed', lastMissionSnapshot: snapshot });
    try {
        await sendMissionUpdate(missionId, {
            event: 'mission_completed',
            data: { detail: 'Goal achieved' }
        });
    } catch (e) { }
    return true;
}

async function executeHeuristicAction(tabId, missionId, ctx, context, snapshot) {
    const action = ctx.action.toUpperCase();
    const { prompt, charDelay } = context;

    if (action === 'NAVIGATE') {
        return await handleHeuristicNavigate(tabId, ctx, prompt, snapshot.url);
    }
    if (action === 'CLICK') {
        const sel = ctx.parameters?.selector || 'button, input[type="submit"], a';
        const ok = await performClick(tabId, sel);
        if (!ok) await performScroll(tabId);
        return;
    }
    if (action === 'TYPE') {
        return await handleHeuristicType(tabId, ctx, charDelay);
    }
    if (action === 'SCROLL') {
        await performScroll(tabId);
        return;
    }
}

async function handleHeuristicNavigate(tabId, ctx, prompt, currentUrl) {
    if (ctx.parameters?.value) {
        await chrome.tabs.update(tabId, { url: ctx.parameters.value });
        await new Promise(res => setTimeout(res, 1200));
        return;
    }
    if (isSearchPrompt(prompt)) {
        const url = buildSearchUrl(prompt);
        try { await chrome.tabs.update(tabId, { url }); } catch (e) { await performScroll(tabId); }
        return;
    }
    const best = await findBestLink(tabId, currentUrl || '');
    if (best) {
        try { await chrome.tabs.update(tabId, { url: best }); } catch (e) { await performScroll(tabId); }
    } else {
        await performScroll(tabId);
    }
}

async function handleHeuristicType(tabId, ctx, charDelay) {
    const sel = ctx.parameters?.selector || 'input, textarea';
    if (sel === 'input, textarea') {
        const autofill = await tryAutoFillForm(tabId, { submit: false });
        if (!autofill.filled) await performScroll(tabId);
        return;
    }
    const ok = await performType(tabId, sel, ctx.parameters?.value || '', charDelay);
    if (!ok) await performScroll(tabId);
}

async function handleTimeout(missionId) {
    await chrome.storage.local.set({ lastMissionStatus: 'timed_out' });
    try {
        await sendMissionUpdate(missionId, {
            event: 'mission_failed',
            data: { detail: 'Timed out' }
        });
    } catch (e) { }
    return false;
}

