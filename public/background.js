// Background service worker for autonomous agent execution (Manifest V3)
import { registerPort, sendMissionUpdate } from './automation/communication.js';
import { captureTabSnapshot, contextualSurveyAwareness } from './automation/snapshot.js';
import { executeMissionSteps } from './automation/executor.js';
import { runHeuristicLoop } from './automation/heuristic.js';

const DEFAULT_PROMPT = 'Survey current page for actionable items';

async function runMissionOnTab(tab, prompt, missionId, steps, options = {}) {
  const tabId = tab.id;
  if (!tabId) return false;
  console.log('[Background] runMissionOnTab for', tab.url, 'prompt=', prompt, 'missionId=', missionId);

  const context = {
    prompt,
    actionDelayMs: options?.actionDelayMs ? Number(options.actionDelayMs) : 900,
    charDelay: options?.charDelay ? Number(options.charDelay) : 40,
    currentUrl: tab.url || '',
    captureTabSnapshot,
    contextualSurveyAwareness
  };

  try {
    if (Array.isArray(steps) && steps.length > 0) {
      await executeMissionSteps(tabId, missionId, steps, context);
      await sendMissionUpdate(missionId, { event: 'mission_completed', data: { detail: 'Mission steps executed' } });
      await chrome.storage.local.set({ lastMissionStatus: 'completed' });
      return true;
    }

    return await runHeuristicLoop(tabId, missionId, context);
  } catch (e) {
    console.error('[Background] runMissionOnTab error', e);
    await sendMissionUpdate(missionId, { event: 'mission_failed', data: { error: String(e) } });
    return false;
  }
}

// Register port connections
chrome.runtime.onConnect.addListener((port) => {
  const missionId = registerPort(port);
  if (!missionId) return;

  port.onMessage.addListener((msg) => {
    if (msg?.type === 'START_MISSION') {
      findTargetTab().then(target => {
        if (!target) return;
        runMissionOnTab(target, msg.prompt || DEFAULT_PROMPT, missionId, msg.steps, msg.options || {});
      });
    }
  });
});

async function findTargetTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs?.[0]?.url && !tabs[0].url.startsWith('chrome://')) return tabs[0];
    const all = await chrome.tabs.query({});
    return all.find(t => t.url && !t.url.startsWith('chrome://')) || null;
  } catch (e) { return null; }
}

async function runMission(prompt) {
  const target = await findTargetTab();
  if (!target) return false;
  const missionId = `mission-${Date.now()}`;
  return await runMissionOnTab(target, prompt, missionId);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'START_MISSION') {
      const ok = await runMissionOnTab(await findTargetTab(), msg.prompt || DEFAULT_PROMPT, msg.missionId || `m-${Date.now()}`, msg.steps, msg.options || {});
      sendResponse({ success: ok });
    } else if (msg?.type === 'SET_AUTONOMOUS') {
      await chrome.storage.local.set({ autonomousEnabled: !!msg.enabled, autonomousPrompt: msg.prompt || '' });
      sendResponse({ ok: true });
    }
  })();
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => { });
  }
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['autonomousEnabled', 'autonomousPrompt'], (res) => {
    if (res?.autonomousEnabled) runMission(res.autonomousPrompt || DEFAULT_PROMPT);
  });
});
