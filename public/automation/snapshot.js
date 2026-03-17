// public/automation/snapshot.js

export function contextualSurveyAwareness(surveyContent) {
    const text = (surveyContent || '').toLowerCase();
    let action = 'SCROLL';
    let parameters = {};
    let reasoning = 'Local heuristic reasoning.';
    let confidence = 0.5;
    let isGoalAchieved = false;
    let successPatternIdentified;

    if (/(submitted|thank you|success|uploaded|completed)/.test(text)) {
        action = 'wait';
        confidence = 1.0;
        isGoalAchieved = true;
        successPatternIdentified = 'Success banner detected';
        reasoning = 'Detected success indicators in environment snapshot.';
    } else if (/(login|sign in|sign-in|please sign in)/.test(text)) {
        action = 'navigate';
        parameters = { value: 'https://accounts.google.com' };
        reasoning = 'Login prompt detected; navigating to sign-in.';
        confidence = 0.7;
    } else if (/(submit|apply|next|continue|save)/.test(text)) {
        action = 'click';
        parameters = { selector: 'button, input[type="submit"], a' };
        reasoning = 'Primary action CTA likely present; attempting click.';
        confidence = 0.6;
    } else {
        action = 'scroll';
        parameters = {};
        reasoning = 'No clear action detected; scrolling to reveal UI.';
        confidence = 0.25;
    }

    return {
        action,
        parameters,
        reasoning,
        confidence,
        isGoalAchieved,
        successPatternIdentified,
    };
}

export async function captureTabSnapshot(tabId) {
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                try {
                    const visibleText = document.body?.innerText || '';
                    const successIndicators = Array.from(document.querySelectorAll('.success, .complete, .thank-you, [role="alert"]'))
                        .map(el => (el && (el.innerText || el.textContent || '')))
                        .join('|');
                    const forms = document.querySelectorAll('form').length;
                    const hashSource = (document.body?.innerHTML?.length || 0) + document.querySelectorAll('*').length;
                    const stateHash = `vsh-${hashSource}-${Date.now().toString().slice(-4)}`;
                    return { url: location.href, title: document.title, text: visibleText.slice(0, 5000), indicators: successIndicators, forms, stateHash };
                } catch (e) {
                    return { error: String(e) };
                }
            }
        });
        return results?.[0]?.result || { error: 'no-result' };
    } catch (e) {
        console.error('[Background] captureTabSnapshot error', e);
        return { error: String(e) };
    }
}
