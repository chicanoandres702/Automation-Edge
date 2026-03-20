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
        } catch {
          fullContext += `\n[Access Denied]\n`;
        }
      }
    }

    return fullContext;
  } catch {
    return "Error scanning environment.";
  }
}

export async function executeAction(action: string, params: any): Promise<boolean> {
  const normAction = action.toUpperCase();
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    console.log(`[SIMULATED ACTION] ${normAction}`, params);
    return true;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return false;

    if (normAction === 'NAVIGATE' && params.value) {
      await chrome.tabs.update(tab.id, { url: params.value });
      return true;
    }
    // For visual feedback, inject a transient pseudo-cursor into the page when clicking/typing.
    if (normAction === 'CLICK' && params?.selector) {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [params.selector],
        func: (selector) => {
          return new Promise<boolean>((resolve) => {
            try {
              const el = document.querySelector(selector) as HTMLElement | null;
              const rect = el ? el.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };

              const cursor = document.createElement('div');
              cursor.style.position = 'fixed';
              cursor.style.left = '0px';
              cursor.style.top = '0px';
              cursor.style.width = '28px';
              cursor.style.height = '28px';
              cursor.style.zIndex = '2147483647';
              cursor.style.pointerEvents = 'none';
              cursor.style.transition = 'transform 0.45s cubic-bezier(0.22,1,0.36,1)';
              cursor.innerHTML = `
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 3l7.5 13L11 13l10 6"></path>
                </svg>`;
              document.documentElement.appendChild(cursor);

              const targetX = rect.left + rect.width / 2 - 6; // center-ish
              const targetY = rect.top + rect.height / 2 - 6;

              // move cursor to target and simulate click
              requestAnimationFrame(() => {
                cursor.style.transform = `translate(${targetX}px, ${targetY}px) scale(1)`;
              });

              setTimeout(() => {
                if (el) {
                  const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                  el.dispatchEvent(evt);
                }
                cursor.style.transform = `translate(${targetX}px, ${targetY}px) scale(0.9)`;
              }, 500);

              setTimeout(() => {
                cursor.remove();
                resolve(true);
              }, 900);
            } catch {
              resolve(false);
            }
          });
        }
      });
      return !!res?.result;
    }

    if (normAction === 'TYPE' && params?.selector && typeof params?.value === 'string') {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [params.selector, params.value],
        func: (selector, value) => {
          return new Promise<boolean>((resolve) => {
            try {
              const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | null;
              const rect = el ? el.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };

              const cursor = document.createElement('div');
              cursor.style.position = 'fixed';
              cursor.style.left = '0px';
              cursor.style.top = '0px';
              cursor.style.width = '28px';
              cursor.style.height = '28px';
              cursor.style.zIndex = '2147483647';
              cursor.style.pointerEvents = 'none';
              cursor.style.transition = 'transform 0.45s cubic-bezier(0.22,1,0.36,1)';
              cursor.innerHTML = `
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 3l7.5 13L11 13l10 6"></path>
                </svg>`;
              document.documentElement.appendChild(cursor);

              const targetX = rect.left + rect.width / 2 - 6;
              const targetY = rect.top + rect.height / 2 - 6;

              requestAnimationFrame(() => {
                cursor.style.transform = `translate(${targetX}px, ${targetY}px) scale(1)`;
              });

              // simple typing simulation
              const text = value;
              let i = 0;
              const interval = setInterval(() => {
                if (!el) return;
                el.value = text.slice(0, i + 1);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                i += 1;
                if (i >= text.length) {
                  clearInterval(interval);
                  cursor.style.transform = `translate(${targetX}px, ${targetY}px) scale(0.9)`;
                  setTimeout(() => { cursor.remove(); resolve(true); }, 300);
                }
              }, 60);
            } catch {
              resolve(false);
            }
          });
        }
      });
      return !!res?.result;
    }

    // fallback for other actions (scroll, generic script execution)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [normAction, params],
      func: (act, _p) => {
        if (act === 'SCROLL') {
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
