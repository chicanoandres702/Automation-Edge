
/**
 * Utility for deep DOM serialization including Visual State Hashing.
 */

export async function captureGlobalContext(): Promise<string> {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.windows) {
    return "Local Dev Mode: Simulation active.";
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
              
              return `URL: ${window.location.href}\nText: ${visibleText}\nVisualMarkers: ${successIndicators}\nActiveForms: ${forms}`;
            }
          });

          results.forEach((r, idx) => {
            fullContext += `\n[Tab: ${tab.title} Frame ${idx}]: ${r.result}\n`;
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
