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

    for (const win of windows) {
      if (!win.tabs) continue;
      for (const tab of win.tabs) {
        if (!tab.id || tab.url?.startsWith('chrome://')) continue;

        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: () => {
              const text = document.body.innerText.substring(0, 3000);
              const forms = document.querySelectorAll('form').length;
              const hash = `vsh-${document.body.innerHTML.length}-${Date.now().toString().slice(-3)}`;
              return { url: window.location.href, text, forms, hash };
            }
          });

          results.forEach((r, i) => {
            const data = r.result as any;
            context += `\n[Tab: ${tab.title} F:${i}] ${data.url}\nHash: ${data.hash}\n${data.text}\n`;
          });
        } catch (e) { context += `\n[Ignored: ${tab.url}]\n`; }
      }
    }
    return context;
  } catch (err) {
    return "Scan error.";
  }
}
