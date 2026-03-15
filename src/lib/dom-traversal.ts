/**
 * Utility for deep DOM serialization including Visual State Hashing.
 */

export async function captureGlobalContext(): Promise<string> {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.windows) {
    return "Local Dev Mode: Simulation active. State Hash: " + Math.random().toString(36).substring(7);
  }

  try {
    const windows = await chrome.windows.getAll({ populate: true });
    let fullContext = "";

    for (const win of windows) {
      if (!win.tabs) continue;
      for (const tab of win.tabs) {
        if (!tab.id || tab.url?.startsWith('chrome://')) continue;
        
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: () => {
              // Capture visual indicators like "Success" messages or hidden banners
              const visibleText = document.body.innerText.substring(0, 3000);
              const successIndicators = Array.from(document.querySelectorAll('.success, .complete, .thank-you, [role="alert"]'))
                .map(el => (el as HTMLElement).innerText)
                .join('|');
              const forms = document.querySelectorAll('form').length;
              
              // Generate a simple visual state hash based on visible structure
              const hashSource = document.body.innerHTML.length + document.querySelectorAll('*').length;
              const stateHash = `vsh-${hashSource}-${Date.now().toString().slice(-4)}`;
              
              return {
                url: window.location.href,
                text: visibleText,
                indicators: successIndicators,
                forms,
                stateHash
              };
            }
          });

          results.forEach((r, idx) => {
            const res = r.result as any;
            fullContext += `\n[Tab: ${tab.title} Frame ${idx}] Hash: ${res.stateHash}\nURL: ${res.url}\nText: ${res.text}\nVisualMarkers: ${res.indicators}\nActiveForms: ${res.forms}\n`;
          });
        } catch (e) {
          fullContext += `\n[Access Denied]\n`;
        }
      }
    }

    return fullContext;
  } catch (err) {
    return "Error scanning environment.";
  }
}

export async function executeAction(action: string, params: any): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    console.log(`[SIMULATED ACTION] ${action}`, params);
    return true;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return false;

    if (action === 'NAVIGATE' && params.value) {
      await chrome.tabs.update(tab.id, { url: params.value });
      return true;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [action, params],
      func: (act, p) => {
        if (act === 'CLICK' && p.selector) {
          const el = document.querySelector(p.selector) as HTMLElement;
          if (el) el.click();
        } else if (act === 'TYPE' && p.selector && p.value) {
          const el = document.querySelector(p.selector) as HTMLInputElement;
          if (el) {
            el.value = p.value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } else if (act === 'SCROLL') {
          window.scrollBy(0, 500);
        }
      }
    });
    return true;
  } catch (e) {
    console.error("Action execution failed", e);
    return false;
  }
}
