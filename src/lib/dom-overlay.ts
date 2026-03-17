/**
 * Injects or updates a tactical mission HUD in the browser tab.
 */
export async function updateBrowserOverlay(step: string | null, status: string = 'idle'): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.runtime?.id) return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || tab.url?.startsWith('chrome://')) return;

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [step, status],
      func: (s, stat) => {
        const ID = 'nexus-mission-overlay';
        let overlay = document.getElementById(ID);

        if (!s || stat === 'completed' || stat === 'idle') {
          if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transform = 'translate(-50%, 20px)';
            setTimeout(() => overlay?.remove(), 500);
          }
          return;
        }

        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = ID;
          overlay.style.cssText = `
            position: fixed; bottom: 24px; left: 50%; transform: translate(-50%, 20px);
            z-index: 2147483647; background: rgba(10, 10, 10, 0.85); backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 10px 24px;
            display: flex; align-items: center; gap: 18px; color: white;
            font-family: system-ui, sans-serif; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            opacity: 0; transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1);
            pointer-events: auto; max-width: 90vw; user-select: none;
          `;
          
          const statusContainer = document.createElement('div');
          statusContainer.style.cssText = 'display: flex; align-items: center; gap: 12px; padding-right: 18px; border-right: 1px solid rgba(255,255,255,0.1);';
          
          const pulse = document.createElement('div');
          pulse.id = ID + '-pulse';
          pulse.style.cssText = 'width: 10px; height: 10px; border-radius: 50%;';
          
          const titleBox = document.createElement('div');
          titleBox.style.cssText = 'display: flex; flex-direction: column; min-width: 180px;';
          titleBox.innerHTML = `
            <span style="font-size: 8px; font-weight: 900; letter-spacing: 0.15em; color: rgba(255,255,255,0.4);">MISSION ACTIVE</span>
            <span id="${ID}-step" style="font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;"></span>
          `;
          
          statusContainer.append(pulse, titleBox);
          overlay.append(statusContainer);

          const controls = document.createElement('div');
          controls.style.cssText = 'display: flex; gap: 8px;';
          const icons: Record<string, string> = {
            'back': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/></svg>',
            'next': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m13 17 5-5-5-5M6 17l5-5-5-5"/></svg>',
            'stop': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>'
          };

          ['back', 'play-pause', 'next', 'stop'].forEach(id => {
            const btn = document.createElement('button');
            btn.id = ID + '-' + id;
            btn.title = id.charAt(0).toUpperCase() + id.slice(1);
            btn.style.cssText = 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;';
            btn.innerHTML = icons[id] || '';
            btn.onclick = () => chrome.runtime.sendMessage({ type: 'MISSION_CONTROL', action: id.toUpperCase() });
            controls.append(btn);
          });
          overlay.append(controls);
          document.body.append(overlay);

          const style = document.createElement('style');
          style.textContent = `@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.9); } } .pulse { animation: pulse 2s infinite; }`;
          document.head.append(style);

          requestAnimationFrame(() => { overlay!.style.opacity = '1'; overlay!.style.transform = 'translate(-50%, 0)'; });
        }

        const stepEl = document.getElementById(ID + '-step');
        if (stepEl) stepEl.textContent = s;

        const ppBtn = document.getElementById(ID + '-play-pause');
        const pulse = document.getElementById(ID + '-pulse');
        const isRun = stat === 'running';
        if (ppBtn) ppBtn.innerHTML = isRun ? '<svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>' : '<svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        if (pulse) { pulse.style.background = isRun ? '#0ea5e9' : '#f59e0b'; pulse.className = isRun ? 'pulse' : ''; }
      }
    });
  } catch (e) {
    console.warn('[HUD] Sync failed', e);
  }
}
