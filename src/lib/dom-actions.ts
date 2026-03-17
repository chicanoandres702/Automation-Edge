import { captureGlobalContext } from "./dom-traversal";

/**
 * Executes a strategic browser action with visual feedback.
 */
export async function executeAction(action: string, params: any): Promise<boolean> {
  const norm = action.toUpperCase();
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.runtime?.id) {
    console.log(`[SIMULATED] ${norm}`, params);
    return true;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return false;

    if (norm === 'NAVIGATE' && params.value) {
      let targetUrl = params.value;
      // Auto-prefix http if the model outputs a raw domain or search intent
      if (!/^https?:\/\//i.test(targetUrl)) {
        // If it looks like a search query and not a domain, route to google
        if (!targetUrl.includes('.') || targetUrl.includes(' ')) {
          targetUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
        } else {
          targetUrl = 'https://' + targetUrl;
        }
      }
      
      await chrome.tabs.update(tab.id, { url: targetUrl });
      
      // Wait a moment for "loading" state to trigger
      await new Promise(r => setTimeout(r, 800));

      for (let i = 0; i < 60; i++) { // Max 30 seconds
        const t = await chrome.tabs.get(tab.id);
        if (t.status === 'complete') {
            console.log(`[NAV] Navigation to ${targetUrl} complete.`);
            return true;
        }
        await new Promise(r => setTimeout(r, 500));
      }
      return true;
    }

    if ((norm === 'CLICK' || norm === 'TYPE') && params.selector) {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [norm, params.selector, params.value],
        func: (a, s, v) => {
          const el = document.querySelector(s) as HTMLElement;
          if (!el) return false; // Explicitly fail if element is missing
          
          const rect = el.getBoundingClientRect();
          const cursor = document.createElement('div');
          cursor.style.cssText = `
            position:fixed; top:50vh; left:50vw; width:24px; height:24px; 
            z-index:2147483647; pointer-events:none; transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            filter: drop-shadow(0 0 8px rgba(14, 165, 233, 0.5));
          `;
          cursor.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="#0ea5e9" stroke="white" stroke-width="1.5"/>
            </svg>`;
          document.body.append(cursor);
          
          // Glide to target
          requestAnimationFrame(() => {
            cursor.style.top = `${rect.top + rect.height/2 - 12}px`;
            cursor.style.left = `${rect.left + rect.width/2 - 12}px`;
          });

          setTimeout(() => {
            // Click Ripple
            const ripple = document.createElement('div');
            ripple.style.cssText = `
              position:fixed; left:${rect.left + rect.width/2 - 10}px; top:${rect.top + rect.height/2 - 10}px;
              width:20px; height:20px; border:2px solid #0ea5e9; border-radius:50%;
              z-index:2147483646; pointer-events:none; transition: all 0.4s ease-out;
            `;
            document.body.append(ripple);
            requestAnimationFrame(() => {
              ripple.style.transform = 'scale(3)';
              ripple.style.opacity = '0';
            });

            if (a === 'CLICK') el.click();
            else if (a === 'TYPE') { 
                (el as HTMLInputElement).value = v; 
                el.dispatchEvent(new Event('input', {bubbles:true})); 
                el.dispatchEvent(new Event('change', {bubbles:true}));
            }
            
            cursor.style.transform = 'scale(0.8)';
            setTimeout(() => {
              cursor.remove();
              ripple.remove();
            }, 400);
          }, 700);
          
          return true; // Successfully started action
        }
      });
      
      if (res && res.result === false) {
          console.warn(`[Action] Element not found for selector: ${params.selector}`);
          return false;
      }
      
      await new Promise(r => setTimeout(r, 1200)); // Sync wait in side panel for animation
      return true;
    }

    return true;
  } catch (e) {
    console.error('[Action] Error:', e);
    return false;
  }
}
