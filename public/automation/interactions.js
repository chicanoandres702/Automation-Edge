// public/automation/interactions.js

export const CURSOR_SVG = `
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 3l7.5 13L11 13l10 6"></path>
  </svg>`;

export const ANTIGRAVITY_TOKENS = ['next', 'continue', 'submit', 'apply', 'start', 'register', 'sign up', 'checkout', 'confirm', 'save', 'download', 'proceed', 'finish', 'complete', 'verify', 'accept', 'get started'];

const SEARCH_TRIGGER_TOKENS = ['search', 'google search', 'search for', 'find', 'bing', 'google', 'duckduckgo', 'yahoo', 'web search'];

globalThis.__antigravityVisited = globalThis.__antigravityVisited || {};

export function isSearchPrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') return false;
    const p = prompt.toLowerCase();
    return SEARCH_TRIGGER_TOKENS.some(t => p.includes(t));
}

export function buildSearchUrl(prompt) {
    if (!prompt) return 'https://www.google.com';
    let p = String(prompt).trim();
    p = p.replace(/\b(google search|search for|web search|search:\s*|google:\s*|bing:\s*|duckduckgo:\s*)/ig, '').trim();
    p = p.replace(/^\b(google|bing|duckduckgo|yahoo)[:\-]?\s*/i, '').trim();
    const lower = prompt.toLowerCase();
    let engine = 'google';
    if (lower.includes('bing')) engine = 'bing';
    else if (lower.includes('duckduckgo')) engine = 'duckduckgo';
    else if (lower.includes('yahoo')) engine = 'yahoo';
    let base;
    switch (engine) {
        case 'bing': base = 'https://www.bing.com/search?q='; break;
        case 'duckduckgo': base = 'https://duckduckgo.com/?q='; break;
        case 'yahoo': base = 'https://search.yahoo.com/search?p='; break;
        default: base = 'https://www.google.com/search?q='; break;
    }
    return base + encodeURIComponent(p || prompt);
}

function _isLikelyInternal(currentHost, href) {
    try { const u = new URL(href); return u.hostname === currentHost || u.hostname.endsWith('.' + currentHost); } catch (e) { return false; }
}

export async function performClick(tabId, selector) {
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            args: [selector, CURSOR_SVG],
            func: (selector, cursorSvg) => {
                return new Promise(resolve => {
                    try {
                        const el = document.querySelector(selector) || Array.from(document.querySelectorAll('button, a, input[type=button], input[type=submit]'))[0];
                        const rect = el ? el.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
                        const cursor = document.createElement('div');
                        Object.assign(cursor.style, {
                            position: 'fixed', left: '0px', top: '0px', width: '28px', height: '28px',
                            zIndex: '2147483647', pointerEvents: 'none', transition: 'transform 0.45s cubic-bezier(0.22,1,0.36,1)'
                        });
                        cursor.innerHTML = cursorSvg;
                        document.documentElement.appendChild(cursor);
                        const tx = rect.left + rect.width / 2 - 6;
                        const ty = rect.top + rect.height / 2 - 6;
                        requestAnimationFrame(() => { cursor.style.transform = `translate(${tx}px, ${ty}px) scale(1)`; });
                        setTimeout(() => {
                            if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                            cursor.style.transform = `translate(${tx}px, ${ty}px) scale(0.9)`;
                        }, 500);
                        setTimeout(() => { cursor.remove(); resolve(true); }, 900);
                    } catch (err) { resolve(false); }
                });
            }
        });
        return !!results?.[0]?.result;
    } catch (e) { return false; }
}

export async function performType(tabId, selector, value, charDelay = 60) {
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            args: [selector, value, charDelay, CURSOR_SVG],
            func: (selector, value, charDelay, cursorSvg) => {
                return new Promise(resolve => {
                    try {
                        const el = document.querySelector(selector) || document.querySelector('input, textarea');
                        const rect = el ? el.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
                        const cursor = document.createElement('div');
                        Object.assign(cursor.style, {
                            position: 'fixed', left: '0px', top: '0px', width: '28px', height: '28px',
                            zIndex: '2147483647', pointerEvents: 'none', transition: 'transform 0.45s cubic-bezier(0.22,1,0.36,1)'
                        });
                        cursor.innerHTML = cursorSvg;
                        document.documentElement.appendChild(cursor);
                        const tx = rect.left + rect.width / 2 - 6;
                        const ty = rect.top + rect.height / 2 - 6;
                        requestAnimationFrame(() => { cursor.style.transform = `translate(${tx}px, ${ty}px) scale(1)`; });
                        const text = value || '';
                        let i = 0;
                        const interval = setInterval(() => {
                            if (el) { el.value = text.slice(0, i + 1); el.dispatchEvent(new Event('input', { bubbles: true })); }
                            i += 1;
                            if (i >= text.length) {
                                clearInterval(interval);
                                cursor.style.transform = `translate(${tx}px, ${ty}px) scale(0.9)`;
                                setTimeout(() => { cursor.remove(); resolve(true); }, 300);
                            }
                        }, charDelay);
                    } catch (err) { resolve(false); }
                });
            }
        });
        return !!results?.[0]?.result;
    } catch (e) { return false; }
}

export async function performScroll(tabId) {
    try {
        await chrome.scripting.executeScript({ target: { tabId }, func: () => { window.scrollBy(0, 500); return true; } });
        return true;
    } catch (e) { return false; }
}

export async function findBestLink(tabId, currentUrl) {
    const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => Array.from(document.querySelectorAll('a[href]'))
            .map(a => ({ href: a.href, text: a.innerText.trim().toLowerCase() }))
            .filter(a => a.href && !a.href.startsWith('j') && !a.href.startsWith('m'))
            .slice(0, 200)
    });

    const list = results?.[0]?.result || [];
    if (!list.length) return null;

    const hostname = new URL(currentUrl).hostname;
    const visited = globalThis.__antigravityVisited[currentUrl] || new Set();

    let best = null;
    let max = -1;

    for (const item of list) {
        const score = getLinkScore(item, hostname, visited);
        if (score > max) {
            max = score;
            best = item.href;
        }
    }

    if (best) {
        globalThis.__antigravityVisited[currentUrl] = visited;
        visited.add(best);
    }
    return best;
}

function getLinkScore(item, host, visited) {
    let s = 0;
    const h = item.href.toLowerCase();

    if (h.includes(host)) s += 20;

    const hasToken = ANTIGRAVITY_TOKENS.some(t => item.text.includes(t) || h.includes(t));
    if (hasToken) s += 12;

    if (!visited.has(item.href)) s += 8;
    return s;
}

export async function tryAutoFillForm(tabId, { submit = false } = {}) {
    const res = await chrome.scripting.executeScript({
        target: { tabId },
        func: (opts) => {
            const maps = {
                email: ['email', 'user'],
                'P@ssw0rd!': ['password'],
                Alex: ['first', 'name'],
                Tester: ['last'],
                '555-0123': ['phone'],
                '1 Test St': ['address']
            };

            const f = Array.from(document.querySelectorAll('form'))
                .sort((a, b) => b.querySelectorAll('input').length - a.querySelectorAll('input').length)[0];
            if (!f) return { filled: false };

            const vals = {};
            f.querySelectorAll('input,textarea,select').forEach(el => {
                if (el.type === 'hidden' || el.disabled) return;
                const name = (el.name || el.id || '').toLowerCase();

                const entry = Object.entries(maps).find(([val, keys]) =>
                    keys.some(k => name.includes(k)) || (keys.includes('email') && el.type === 'email')
                );

                if (entry) { el.value = entry[0]; vals[name] = entry[0]; }
                else if (el.tagName === 'SELECT') { el.selectedIndex = 1; }
                else { el.value = el.placeholder || 'auto'; }
                el.dispatchEvent(new Event('input', { bubbles: true }));
            });

            if (opts.submit) f.querySelector('[type=submit], button')?.click();
            return { filled: true, values: vals };
        },
        args: [{ submit }]
    });
    return res?.[0]?.result || { filled: false };
}

