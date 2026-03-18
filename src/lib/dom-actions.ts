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
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    let tab = tabs && tabs[0] ? tabs[0] : null;

    const blockedPrefixes = ['chrome://', 'edge://', 'about:', 'view-source:', 'file://', 'filesystem:', 'devtools://', 'extension://', 'chrome-extension://', 'moz-extension://', 'safari-extension://'];

    const isProtected = (tUrl?: string) => !!(tUrl && blockedPrefixes.some(p => tUrl.startsWith(p)));

    // If there is no active tab (this can happen when running inside the
    // side-panel or a non-tab context), try to find any suitable tab across
    // all windows that is not a protected internal page. Previously we
    // returned early which caused actions like 'open url' to silently fail.
    if (!tab?.id) {
      try {
        const allTabs = await chrome.tabs.query({});
        const candidate = allTabs.find(t => t.id && t.url && !isProtected(t.url));
        if (candidate) {
          tab = candidate;
          console.log('[Action] No active tab found; using candidate tab', tab.url);
        }
      } catch (e) {
        console.warn('[Action] Error querying all tabs for candidate:', e);
      }
      if (!tab?.id) return false;
    }

    // If the active tab is an internal/protected page (e.g., the extension UI),
    // attempt to find a suitable candidate tab in the current window or across
    // all windows that is not protected. This ensures actions like `go_to_url`
    // target a real browser tab instead of the extension's own page.
    if (isProtected(tab.url)) {
      try {
        const windowTabs = await chrome.tabs.query({ currentWindow: true });
        const candidate = windowTabs.find(t => t.id && t.url && !isProtected(t.url));
        if (candidate) {
          console.log('[Action] Active tab is protected; switching target to', candidate.url);
          tab = candidate;
        } else {
          const allTabs = await chrome.tabs.query({});
          const candidate2 = allTabs.find(t => t.id && t.url && !isProtected(t.url));
          if (candidate2) {
            console.log('[Action] Found suitable tab in other window; switching target to', candidate2.url);
            tab = candidate2;
          } else {
            console.warn('[Action] No suitable browser tab to perform actions; aborting. Current:', tab.url);
            return false;
          }
        }
      } catch (e) {
        console.warn('[Action] Error finding candidate tab:', e);
        return false;
      }
    }

    // Emit a short telemetry/debug message about the target tab selected
    try {
      try { chrome.runtime.sendMessage({ type: 'ACTION', event: 'target_tab', data: { tabId: tab.id, url: tab.url } }); } catch (e) {}
    } catch (e) {}

    if (norm === 'NAVIGATE' && params.value) {
      // Robust navigation target resolution:
      // - Strip leading verbs like "navigate to", "open", "go to"
      // - Map obvious site names (google, youtube, github) to their homepages
      // - If looks like a hostname (contains a dot) prefix https://
      // - If contains spaces or looks like a query, perform a Google search
      const raw = String(params.value || '').trim();
      const stripPrefix = (s: string) => s.replace(/^\s*(navigate|go|open|visit|goto|head to|browse to|go to)\b[:\s\-]*/i, '').replace(/^to\s+/i, '').trim();
      let cleaned = stripPrefix(raw).replace(/^\"|\"$/g, '').replace(/^\'|\'$/g, '');

      const hostMap: Record<string, string> = {
        'google': 'https://www.google.com',
        'youtube': 'https://www.youtube.com',
        'github': 'https://github.com',
        'stackoverflow': 'https://stackoverflow.com',
        'npm': 'https://www.npmjs.com',
        'twitter': 'https://twitter.com',
        'linkedin': 'https://www.linkedin.com',
        'facebook': 'https://www.facebook.com'
      };

      const lower = cleaned.toLowerCase();
      // If user asked for a "homepage" or used a well-known brand, map to its homepage
      const brand = Object.keys(hostMap).find(k => lower.includes(k));
      let targetUrl = '';
      if (brand) {
        targetUrl = hostMap[brand];
      } else if (/^https?:\/\//i.test(cleaned)) {
        targetUrl = cleaned;
      } else if (/^[^\s]+\.[^\s]+$/.test(cleaned)) {
        // looks like a domain
        targetUrl = 'https://' + cleaned;
      } else if (cleaned.startsWith('/')) {
        // relative path — resolve against current tab origin if available
        try {
          const origin = tab.url ? (new URL(tab.url)).origin : '';
          targetUrl = origin ? origin + cleaned : `https://www.google.com/search?q=${encodeURIComponent(cleaned)}`;
        } catch (e) {
          targetUrl = `https://www.google.com/search?q=${encodeURIComponent(cleaned)}`;
        }
      } else if (!cleaned || cleaned.split(' ').length > 1) {
        // treat multi-word or empty targets as search queries
        targetUrl = `https://www.google.com/search?q=${encodeURIComponent(cleaned || raw)}`;
      } else {
        // single word with no dot — prefer brand resolution, otherwise search
        targetUrl = `https://www.google.com/search?q=${encodeURIComponent(cleaned)}`;
      }

      let navigated = false;
      try {
        const updated = await chrome.tabs.update(tab.id, { url: targetUrl, active: true });
        navigated = true;
        try { chrome.runtime.sendMessage({ type: 'ACTION', event: 'navigate_attempt', data: { method: 'update', targetUrl, tabId: tab.id } }); } catch (e) {}
        try {
          // Ensure the window hosting the tab is focused so the user sees the navigation
          if (updated && (updated as any).windowId) {
            try { chrome.windows.update((updated as any).windowId, { focused: true }); } catch (e) { /* ignore */ }
          }
        } catch (e) { /* ignore */ }
      } catch (e) {
        console.warn('[NAV] tabs.update failed, attempting fallback to open a new tab:', e);
        try {
          const newTab = await chrome.tabs.create({ url: targetUrl, active: true });
          if (newTab && newTab.id) {
            tab = newTab;
            navigated = true;
            try { chrome.runtime.sendMessage({ type: 'ACTION', event: 'navigate_fallback_new_tab', data: { newTabId: newTab.id, targetUrl } }); } catch (er) {}
            try { if ((newTab as any).windowId) await chrome.windows.update((newTab as any).windowId, { focused: true }); } catch (er) { /* ignore */ }
          }
        } catch (e2) {
          console.error('[NAV] Failed to open new tab as fallback:', e2);
          try { chrome.runtime.sendMessage({ type: 'ACTION', event: 'navigate_failed', data: { targetUrl, error: String(e2) } }); } catch (er) {}
          return false;
        }
      }

      // Wait a moment for "loading" state to trigger
      await new Promise(r => setTimeout(r, 800));

      for (let i = 0; i < 60; i++) { // Max 30 seconds
        try {
          const t = await chrome.tabs.get(tab.id);
          if (t.status === 'complete') {
            console.log(`[NAV] Navigation to ${targetUrl} complete.`);
            return true;
          }
        } catch (e) {
          // Tab may no longer exist; break and return success if we opened a new tab
          console.warn('[NAV] Unable to query tab status:', e);
          if (navigated) return true;
          return false;
        }
        await new Promise(r => setTimeout(r, 500));
      }
      return true;
    }

    // Explicit go_to_url tool: open a fully-qualified URL (preferred when AI supplies exact URL)
    if ((norm === 'GO_TO_URL' || norm === 'GOTO' || norm === 'GO-TO-URL') && (params.url || params.value)) {
      let targetUrl = String(params.url || params.value || '').trim();
      if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'https://' + targetUrl;
      let navigated = false;
      try {
        const updated = await chrome.tabs.update(tab.id, { url: targetUrl, active: true });
        navigated = true;
        try { chrome.runtime.sendMessage({ type: 'ACTION', event: 'go_to_url_attempt', data: { method: 'update', targetUrl, tabId: tab.id } }); } catch (e) {}
        try { if (updated && (updated as any).windowId) await chrome.windows.update((updated as any).windowId, { focused: true }); } catch (e) { /* ignore */ }
      } catch (e) {
        console.warn('[NAV] tabs.update failed for go_to_url; creating new tab as fallback:', e);
        try {
          const newTab = await chrome.tabs.create({ url: targetUrl, active: true });
          if (newTab && newTab.id) {
            tab = newTab;
            navigated = true;
            try { chrome.runtime.sendMessage({ type: 'ACTION', event: 'go_to_url_fallback_new_tab', data: { newTabId: newTab.id, targetUrl } }); } catch (er) {}
            try { if ((newTab as any).windowId) await chrome.windows.update((newTab as any).windowId, { focused: true }); } catch (er) { /* ignore */ }
          }
        } catch (e2) {
          console.error('[NAV] Failed to create fallback tab for go_to_url:', e2);
          try { chrome.runtime.sendMessage({ type: 'ACTION', event: 'go_to_url_failed', data: { targetUrl, error: String(e2) } }); } catch (er) {}
          return false;
        }
      }
      await new Promise(r => setTimeout(r, 700));
      for (let i = 0; i < 60; i++) {
        try {
          const t = await chrome.tabs.get(tab.id);
          if (t.status === 'complete') {
            console.log(`[NAV] go_to_url to ${targetUrl} complete.`);
            return true;
          }
        } catch (e) {
          console.warn('[NAV] Unable to query tab status after go_to_url:', e);
          if (navigated) return true;
          return false;
        }
        await new Promise(r => setTimeout(r, 500));
      }
      return true;
    }

    // Scroll tool: scroll the viewport by amount or to top/bottom
    if (norm === 'SCROLL') {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [params],
        func: (p) => {
          try {
            const wait = (ms) => new Promise(r => setTimeout(r, ms));
            const dir = (p && p.direction) || 'down';
            const unit = (p && p.unit) || 'px';
            const behavior = (p && p.behavior) || 'smooth';
            if (p && p.to === 'top') { window.scrollTo({ top: 0, behavior }); return { success: true, action: 'top' }; }
            if (p && p.to === 'bottom') { window.scrollTo({ top: document.body.scrollHeight, behavior }); return { success: true, action: 'bottom' }; }
            let amount = p && p.amount ? Number(p.amount) : null;
            if (amount == null || Number.isNaN(amount)) amount = Math.round(window.innerHeight * 0.8);
            if (unit === 'percent') amount = Math.round(window.innerHeight * (Number(p.amount) / 100));
            if (unit === 'vh') amount = Math.round(window.innerHeight * Number(p.amount));
            if (dir === 'up') amount = -Math.abs(amount);
            window.scrollBy({ top: amount, left: 0, behavior });
            return { success: true, scrolled: amount };
          } catch (e) { return { success: false, error: String(e) }; }
        }
      });
      const result = res && res.result ? res.result : null;
      return !!(result && result.success === true);
    }

    // Drag tool: simulate a drag from start to end selectors or by delta
    if (norm === 'DRAG') {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [params],
        func: async (p) => {
          const wait = (ms) => new Promise(r => setTimeout(r, ms));
          try {
            const getCenter = (el) => {
              const r = el.getBoundingClientRect();
              return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
            };
            let start = null, end = null;
            if (p.startSelector) {
              const s = document.querySelector(p.startSelector);
              if (!s) return { success: false, error: 'startSelector not found' };
              start = getCenter(s);
            }
            if (p.endSelector) {
              const e = document.querySelector(p.endSelector);
              if (!e) return { success: false, error: 'endSelector not found' };
              end = getCenter(e);
            }
            if (!start && p.deltaX == null && p.deltaY == null) return { success: false, error: 'insufficient drag parameters' };
            if (!start) start = { x: Math.round(window.innerWidth/2), y: Math.round(window.innerHeight/2) };
            if (!end) end = { x: start.x + (Number(p.deltaX) || 0), y: start.y + (Number(p.deltaY) || 0) };
            const duration = Math.max(50, Number(p.durationMs) || 300);
            const steps = Math.max(3, Math.round(duration / 16));
            const dispatch = (type, x, y) => {
              const el = document.elementFromPoint(x, y) || document.body;
              el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'mouse' }));
            };
            dispatch('pointerover', start.x, start.y);
            dispatch('pointerenter', start.x, start.y);
            dispatch('pointerdown', start.x, start.y);
            for (let i = 1; i <= steps; i++) {
              const t = i / steps;
              const cx = Math.round(start.x + (end.x - start.x) * t);
              const cy = Math.round(start.y + (end.y - start.y) * t);
              dispatch('pointermove', cx, cy);
              await wait(Math.round(duration / steps));
            }
            dispatch('pointerup', end.x, end.y);
            return { success: true };
          } catch (e) { return { success: false, error: String(e) }; }
        }
      });
      const result = res && res.result ? res.result : null;
      return !!(result && result.success === true);
    }

    // Touch tool: simulate a pointer/touch at selector or coords
    if (norm === 'TOUCH') {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [params],
        func: (p) => {
          try {
            const actAt = (x, y) => {
              const el = document.elementFromPoint(x, y) || document.body;
              const dispatch = (type) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'touch' }));
              dispatch('pointerover'); dispatch('pointerdown'); dispatch('pointerup'); dispatch('click');
            };
            if (p.selector) {
              const el = document.querySelector(p.selector);
              if (!el) return { success: false, error: 'selector not found' };
              const r = el.getBoundingClientRect();
              actAt(Math.round(r.left + r.width/2), Math.round(r.top + r.height/2));
              return { success: true };
            }
            if (typeof p.x === 'number' && typeof p.y === 'number') { actAt(Math.round(p.x), Math.round(p.y)); return { success: true }; }
            return { success: false, error: 'no selector or coordinates provided' };
          } catch (e) { return { success: false, error: String(e) }; }
        }
      });
      const result = res && res.result ? res.result : null;
      return !!(result && result.success === true);
    }

    if ((norm === 'CLICK' || norm === 'TYPE') && params.selector) {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [norm, params.selector, params.value],
        func: async (a, s, v) => {
          // Helper utilities
          const wait = (ms) => new Promise(r => setTimeout(r, ms));
          const isVisible = (el) => {
            try {
              const rect = el.getBoundingClientRect();
              const style = getComputedStyle(el);
              return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && (rect.bottom >= 0 && rect.top <= window.innerHeight);
            } catch (e) { return false; }
          };
          const isDisabled = (el) => {
            try { return !!(el.disabled || el.getAttribute && el.getAttribute('aria-disabled') === 'true' || el.hasAttribute && el.hasAttribute('disabled')); } catch (e) { return false; }
          };
          const textOf = (el) => (el && (el.innerText || el.value || el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder')) || '')).toString().trim();

          // Attempt to gather candidates using the selector
          let els = [];
          if (s) {
            try { els = Array.from(document.querySelectorAll(s)); } catch (e) { els = []; }
          }

          // If selector yields a unique, visible, non-disabled element, use it directly
          if (s) {
            try {
              const direct = document.querySelector(s);
              if (direct && isVisible(direct) && !isDisabled(direct)) {
                const rect = direct.getBoundingClientRect();
                return { success: true, strategy: 'direct', meta: { tagName: direct.tagName, id: direct.id || '', className: (direct.className || '').toString().slice(0, 200), aria: direct.getAttribute && direct.getAttribute('aria-label') || '', text: (textOf(direct) || '').slice(0, 200), rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } } };
              }
            } catch (e) { /* ignore invalid selectors */ }
          }

          // If no elements via selector, try text-match across interactive elements
          if (!els.length) {
            const all = Array.from(document.querySelectorAll('button, a, [role="button"], input, textarea, [contenteditable], label'));
            const text = v ? String(v).toLowerCase().trim() : null;
            if (text) {
              const found = all.find(e => (textOf(e) || '').toLowerCase().includes(text) && isVisible(e) && !isDisabled(e));
              if (found) {
                const r = found.getBoundingClientRect();
                return { success: true, strategy: 'textMatch', meta: { tagName: found.tagName, id: found.id || '', className: (found.className || '').toString().slice(0,200), aria: found.getAttribute && found.getAttribute('aria-label') || '', text: (textOf(found)||'').slice(0,200), rect: { top: r.top, left: r.left, width: r.width, height: r.height } } };
              }
            }
            return { success: false, strategy: 'none' };
          }

          // Score candidates to pick the best one
          const scored = els.map(el => {
            const rect = el.getBoundingClientRect();
            const visible = isVisible(el);
            let score = 0;
            const tag = (el.tagName || '').toLowerCase();
            const role = (el.getAttribute && el.getAttribute('role') || '').toLowerCase();
            if (tag === 'button' || tag === 'a' || role.includes('button')) score += 200;
            if (visible) score += 150;
            const area = Math.max(0, rect.width) * Math.max(0, rect.height);
            score += Math.min(120, Math.floor(area / 150));
            const aria = (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder'))) || '';
            const text = (textOf(el) || '');
            if (v) {
              const low = String(v).toLowerCase();
              if (aria.toLowerCase().includes(low) || text.toLowerCase().includes(low) || (el.id || '').toLowerCase().includes(low)) score += 180;
            }
            if (el.disabled || (el.getAttribute && el.getAttribute('aria-disabled') === 'true')) score -= 1000;
            const style = getComputedStyle(el);
            if (style.pointerEvents === 'none' || parseFloat(style.opacity || '1') < 0.05) score -= 500;
            try {
              const cx = rect.left + rect.width/2; const cy = rect.top + rect.height/2;
              const top = document.elementFromPoint(cx, cy);
              if (top === el || el.contains(top)) score += 120;
            } catch (e) {}
            return { el, score, rect, tag, aria, text, id: el.id || '', className: (el.className || '').toString() };
          });

          scored.sort((a,b) => b.score - a.score);
          const best = scored[0];
          if (!best) return { success: false, strategy: 'noCandidates' };

          const el = best.el;
          const meta = { tagName: best.tag, id: best.id, className: (best.className || '').slice(0,200), aria: best.aria || '', text: (best.text||'').slice(0,200), rect: { top: best.rect.top, left: best.rect.left, width: best.rect.width, height: best.rect.height }, score: best.score };

          // Add a short highlighted overlay so user / UI can confirm visually
          const overlay = document.createElement('div');
          overlay.style.position = 'fixed';
          overlay.style.left = `${best.rect.left}px`;
          overlay.style.top = `${best.rect.top}px`;
          overlay.style.width = `${Math.max(6, best.rect.width)}px`;
          overlay.style.height = `${Math.max(6, best.rect.height)}px`;
          overlay.style.border = '3px solid rgba(14,165,233,0.95)';
          overlay.style.background = 'rgba(14,165,233,0.06)';
          overlay.style.zIndex = '2147483647';
          overlay.style.pointerEvents = 'none';
          overlay.style.transition = 'opacity 0.18s ease';
          document.body.appendChild(overlay);

          // Ensure element is visible and centered
          try { el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' }); } catch (e) {}
          await wait(120);

          const rectNow = el.getBoundingClientRect();
          const cx = rectNow.left + rectNow.width/2; const cy = rectNow.top + rectNow.height/2;

          // Robust click implementation
          const robustClick = async (target) => {
            try {
              // try native click first
              target.click();
            } catch (e) {
              const dispatch = (t, type) => t.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window }));
              const elAtPoint = document.elementFromPoint(cx, cy) || target;
              try { dispatch(elAtPoint, 'mouseover'); dispatch(elAtPoint, 'mousemove'); } catch (e) {}
              try { dispatch(elAtPoint, 'mousedown'); dispatch(elAtPoint, 'mouseup'); dispatch(elAtPoint, 'click'); } catch (e) {}
            }
            await wait(90);
            return true;
          };

          if (a === 'CLICK') {
            // Show an in-page confirmation dialog so the user can approve the action
            const showConfirmInPage = async (message) => {
              return await new Promise((resolve) => {
                try {
                  const rid = 'ag-confirm-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
                  const style = document.createElement('style');
                  style.id = rid + '-style';
                  style.textContent = `
                    #${rid}-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.48);z-index:2147483646;display:flex;align-items:center;justify-content:center}
                    #${rid}-dialog{background:#fff;color:#0b1220;border-radius:10px;max-width:640px;width:92%;padding:14px 16px;box-shadow:0 20px 50px rgba(2,6,23,0.45);font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
                    #${rid}-dialog h2{margin:0 0 6px;font-size:16px}
                    #${rid}-dialog p{margin:0 0 12px;font-size:14px;color:#111}
                    #${rid}-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:6px}
                    #${rid}-confirm{background:#0ea5e9;border:none;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer}
                    #${rid}-cancel{background:transparent;border:1px solid #c7c7c7;padding:8px 12px;border-radius:8px;cursor:pointer}
                  `;
                  document.head.appendChild(style);

                  const backdrop = document.createElement('div'); backdrop.id = rid + '-backdrop';
                  const dialog = document.createElement('div'); dialog.id = rid + '-dialog'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.tabIndex = -1;
                  const title = document.createElement('h2'); title.id = rid + '-title'; title.textContent = 'Confirm action';
                  const desc = document.createElement('p'); desc.id = rid + '-desc'; desc.textContent = message || 'Confirm this action?';
                  const actions = document.createElement('div'); actions.id = rid + '-actions';
                  const btnCancel = document.createElement('button'); btnCancel.id = rid + '-cancel'; btnCancel.textContent = 'Cancel';
                  const btnConfirm = document.createElement('button'); btnConfirm.id = rid + '-confirm'; btnConfirm.textContent = 'Confirm';
                  actions.appendChild(btnCancel); actions.appendChild(btnConfirm);
                  dialog.appendChild(title); dialog.appendChild(desc); dialog.appendChild(actions);
                  backdrop.appendChild(dialog);
                  document.body.appendChild(backdrop);

                  const cleanup = () => {
                    try { backdrop.remove(); } catch (e) {}
                    try { style.remove(); } catch (e) {}
                    window.removeEventListener('keydown', keyHandler);
                  };

                  const keyHandler = (ev) => {
                    if (ev.key === 'Escape') { ev.preventDefault(); cleanup(); resolve(false); }
                    if (ev.key === 'Enter') { ev.preventDefault(); cleanup(); resolve(true); }
                    if (ev.key === 'Tab') {
                      const focusables = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                      const focusable = Array.prototype.filter.call(focusables, (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
                      if (!focusable.length) return;
                      const first = focusable[0], last = focusable[focusable.length - 1];
                      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
                      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
                    }
                  };

                  btnConfirm.addEventListener('click', () => { cleanup(); resolve(true); });
                  btnCancel.addEventListener('click', () => { cleanup(); resolve(false); });
                  setTimeout(() => { try { btnConfirm.focus(); } catch (e) {} window.addEventListener('keydown', keyHandler); }, 30);
                } catch (e) {
                  try { resolve(true); } catch (er) {}
                }
              });
            };

            const textPreview = (meta && meta.text) ? meta.text : (el && (el.innerText || el.value) ? (el.innerText || el.value).toString().slice(0,200) : '');
            const confirmText = textPreview ? `Click element: "${textPreview}"\n\nClick Confirm to proceed.` : 'Click element?\n\nClick Confirm to proceed.';
            const userOk = await showConfirmInPage(confirmText);
            if (!userOk) { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 220); return { success: false, strategy: 'abortedByUser', meta }; }

            let ok = false;
            for (let i = 0; i < 3; i++) {
              try { ok = await robustClick(el); if (ok) break; } catch (e) { await wait(120); }
            }
            overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 220);
            return { success: !!ok, strategy: 'scored', meta };
          }

          if (a === 'TYPE') {
            let tgt = el;
            const tag = (tgt.tagName || '').toLowerCase();
            if (!(tag === 'input' || tag === 'textarea' || tgt.isContentEditable)) {
              const inside = tgt.querySelector && tgt.querySelector('input,textarea,[contenteditable]'); if (inside) tgt = inside;
            }

            // confirm typing with in-page dialog
            const showConfirmInPage = async (message) => {
              return await new Promise((resolve) => {
                try {
                  const rid = 'ag-confirm-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
                  const style = document.createElement('style');
                  style.id = rid + '-style';
                  style.textContent = `
                    #${rid}-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.48);z-index:2147483646;display:flex;align-items:center;justify-content:center}
                    #${rid}-dialog{background:#fff;color:#0b1220;border-radius:10px;max-width:640px;width:92%;padding:14px 16px;box-shadow:0 20px 50px rgba(2,6,23,0.45);font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
                    #${rid}-dialog h2{margin:0 0 6px;font-size:16px}
                    #${rid}-dialog p{margin:0 0 12px;font-size:14px;color:#111}
                    #${rid}-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:6px}
                    #${rid}-confirm{background:#0ea5e9;border:none;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer}
                    #${rid}-cancel{background:transparent;border:1px solid #c7c7c7;padding:8px 12px;border-radius:8px;cursor:pointer}
                  `;
                  document.head.appendChild(style);

                  const backdrop = document.createElement('div'); backdrop.id = rid + '-backdrop';
                  const dialog = document.createElement('div'); dialog.id = rid + '-dialog'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.tabIndex = -1;
                  const title = document.createElement('h2'); title.id = rid + '-title'; title.textContent = 'Confirm typing';
                  const desc = document.createElement('p'); desc.id = rid + '-desc'; desc.textContent = message || 'Confirm typing?';
                  const actions = document.createElement('div'); actions.id = rid + '-actions';
                  const btnCancel = document.createElement('button'); btnCancel.id = rid + '-cancel'; btnCancel.textContent = 'Cancel';
                  const btnConfirm = document.createElement('button'); btnConfirm.id = rid + '-confirm'; btnConfirm.textContent = 'Confirm';
                  actions.appendChild(btnCancel); actions.appendChild(btnConfirm);
                  dialog.appendChild(title); dialog.appendChild(desc); dialog.appendChild(actions);
                  backdrop.appendChild(dialog);
                  document.body.appendChild(backdrop);

                  const cleanup = () => {
                    try { backdrop.remove(); } catch (e) {}
                    try { style.remove(); } catch (e) {}
                    window.removeEventListener('keydown', keyHandler);
                  };

                  const keyHandler = (ev) => {
                    if (ev.key === 'Escape') { ev.preventDefault(); cleanup(); resolve(false); }
                    if (ev.key === 'Enter') { ev.preventDefault(); cleanup(); resolve(true); }
                    if (ev.key === 'Tab') {
                      const focusables = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                      const focusable = Array.prototype.filter.call(focusables, (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
                      if (!focusable.length) return;
                      const first = focusable[0], last = focusable[focusable.length - 1];
                      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
                      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
                    }
                  };

                  btnConfirm.addEventListener('click', () => { cleanup(); resolve(true); });
                  btnCancel.addEventListener('click', () => { cleanup(); resolve(false); });
                  setTimeout(() => { try { btnConfirm.focus(); } catch (e) {} window.addEventListener('keydown', keyHandler); }, 30);
                } catch (e) { try { resolve(true); } catch (er) {} }
              });
            };

            const preview = (v || '').toString().slice(0, 400);
            const confirmText = preview ? `Will type: "${preview}"\n\nClick Confirm to proceed.` : 'Will type text. Click Confirm to proceed.';
            const userOk = await showConfirmInPage(confirmText);
            if (!userOk) { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 220); return { success: false, strategy: 'abortedByUser', meta }; }

            let typed = false;
            try {
              if (tgt.isContentEditable) {
                tgt.focus();
                tgt.innerText = v || '';
                tgt.dispatchEvent(new InputEvent('input', { bubbles: true }));
                typed = true;
              } else if (tgt.tagName && (tgt.tagName.toLowerCase() === 'input' || tgt.tagName.toLowerCase() === 'textarea')) {
                tgt.focus();
                const prev = tgt.value;
                tgt.value = v || '';
                tgt.dispatchEvent(new Event('input', { bubbles: true }));
                tgt.dispatchEvent(new Event('change', { bubbles: true }));
                typed = tgt.value === (v || '');
              } else {
                const temp = document.createElement('input');
                temp.style.position = 'fixed'; temp.style.left = '-9999px'; temp.style.top = '0';
                document.body.appendChild(temp);
                temp.value = v || '';
                temp.dispatchEvent(new Event('input', { bubbles: true }));
                temp.dispatchEvent(new Event('change', { bubbles: true }));
                setTimeout(() => temp.remove(), 200);
                typed = true;
              }
            } catch (e) {}
            overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 220);
            return { success: typed, strategy: 'scored', meta };
          }

          overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 220);
          return { success: false, strategy: 'unknown' };
        }
      });

      const result = res && res.result ? res.result : null;
      if (!result || result.success !== true) {
        console.warn(`[Action] Element not found for selector: ${params.selector}`);
        try {
          const payload = { selector: params.selector, success: false, strategy: result?.strategy || 'none', url, meta: result?.meta || null };
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['telemetry_enabled'], (cfg: any) => {
              if (cfg?.telemetry_enabled === false) return;
              try { chrome.runtime.sendMessage({ type: 'TELEMETRY', event: 'selector_choice', data: payload }); } catch (e) { }
            });
          } else {
            try { chrome.runtime.sendMessage({ type: 'TELEMETRY', event: 'selector_choice', data: payload }); } catch (e) { }
          }
        } catch (e) { /* ignore telemetry errors */ }
        return false;
      }

      try {
        const payload = { selector: params.selector, success: true, strategy: result.strategy || 'unknown', url, meta: result.meta || null };
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['telemetry_enabled'], (cfg: any) => {
            if (cfg?.telemetry_enabled === false) return;
            try { chrome.runtime.sendMessage({ type: 'TELEMETRY', event: 'selector_choice', data: payload }); } catch (e) { }
          });
        } else {
          try { chrome.runtime.sendMessage({ type: 'TELEMETRY', event: 'selector_choice', data: payload }); } catch (e) { }
        }
      } catch (e) { /* ignore telemetry errors */ }

      await new Promise(r => setTimeout(r, 350)); // allow animations to complete
      return true;
    }

    return true;
  } catch (e) {
    console.error('[Action] Error:', e);
    return false;
  }
}
