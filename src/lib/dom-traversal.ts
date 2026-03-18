/**
 * Deep DOM scanning for mission context and visual state hashing.
 */
export async function captureGlobalContext(): Promise<string> {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.runtime?.id) {
    return "Dev Simulation: " + Math.random().toString(36).substring(7);
  }

  try {
    const windows = await chrome.windows.getAll({ populate: true });
    let context = "";

    const blockedPrefixes = ['chrome://', 'edge://', 'about:', 'view-source:', 'file://', 'filesystem:', 'devtools://', 'extension://', 'chrome-extension://', 'moz-extension://', 'safari-extension://'];

    for (const win of windows) {
      if (!win.tabs) continue;
      for (const tab of win.tabs) {
        const url = tab?.url || '';
        if (!tab.id || blockedPrefixes.some(p => url.startsWith(p))) continue;

        try {
          // Load user-configurable smart scrolling settings from storage (if available)
          let maxIterations = 30;
          let scrollFactor = 0.8;
          let waitBase = 300;
          try {
            const cfg: any = await new Promise(res => chrome.storage.local.get(['smart_max_iterations', 'smart_scroll_factor', 'smart_wait_base_ms'], r => res(r)));
            if (cfg) {
              if (cfg.smart_max_iterations) maxIterations = Number(cfg.smart_max_iterations) || maxIterations;
              if (cfg.smart_scroll_factor) scrollFactor = Number(cfg.smart_scroll_factor) || scrollFactor;
              if (cfg.smart_wait_base_ms) waitBase = Number(cfg.smart_wait_base_ms) || waitBase;
            }
          } catch (err) { /* ignore storage read errors */ }

          // Smart viewport-based scanning with in-page incremental scrolling.
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: async (maxIterations = 30, scrollFactor = 0.8, waitBase = 300) => {
              const snapshots = [];
              try {
                const originalY = window.scrollY || 0;
                const getVisibleText = () => {
                  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
                  let node = null;
                  const parts = [];
                  while ((node = walker.nextNode())) {
                    const parent = node.parentElement;
                    if (!parent) continue;
                    const rect = parent.getBoundingClientRect();
                    if (rect.width <= 0 || rect.height <= 0) continue;
                    if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
                    const txt = (node.textContent || '').trim();
                    if (txt) parts.push(txt);
                    if (parts.join(' ').length > 3000) break;
                  }
                  return parts.join(' ').substring(0, 3000);
                };

                let lastBodyLen = 0;
                let stagnantCount = 0;
                for (let i = 0; i < maxIterations; i++) {
                  const visibleText = getVisibleText();
                  snapshots.push({ url: window.location.href, text: visibleText, forms: document.querySelectorAll('form').length, hash: `vsh-${document.body.innerHTML.length}-${Date.now().toString().slice(-3)}` });

                  const bodyLen = (document.body && document.body.innerText) ? document.body.innerText.length : 0;
                  if (bodyLen === lastBodyLen) stagnantCount++; else stagnantCount = 0;
                  lastBodyLen = bodyLen;

                  // If we've reached the bottom and content hasn't changed for a couple iterations, stop
                  if ((window.scrollY + window.innerHeight) >= (document.body.scrollHeight - 10) && stagnantCount >= 2) break;

                  const step = Math.max(Math.floor(window.innerHeight * scrollFactor), 400);
                  window.scrollBy(0, step);
                  // Wait for lazy content to load; ramp up wait slightly each iteration
                  const waitMs = waitBase + Math.min(i * 200, 1000);
                  await new Promise(r => setTimeout(r, waitMs));
                }

                // restore original scroll position
                try { window.scrollTo(0, originalY); } catch (e) { /* ignore */ }
              } catch (err) {
                // If anything fails in page, return at least a single snapshot
                snapshots.push({ url: window.location.href, text: (document.body && document.body.innerText) ? document.body.innerText.substring(0, 3000) : '', forms: document.querySelectorAll('form').length, hash: `vsh-${Date.now().toString().slice(-6)}` });
              }
              return snapshots;
            },
            args: [maxIterations, scrollFactor, waitBase]
          });

          // results contains one entry per frame; each entry.result is an array of snapshots for that frame
          results.forEach((r, i) => {
            const frameData = r.result as any[] || [];
            frameData.forEach((data, j) => {
              context += `\n[Tab: ${tab.title} F:${i} P:${j}] ${data.url}\nHash: ${data.hash}\n${data.text}\n`;
            });
          });
        } catch (e) { context += `\n[Ignored: ${tab.url}]\n`; }
      }
    }
    return context;
  } catch (err) {
    return "Scan error.";
  }
}
