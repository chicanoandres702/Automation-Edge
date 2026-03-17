#!/usr/bin/env node
// Attach to all extension-related CDP targets (page, service_worker, background_page),
// enable Network and Console on each, trigger the Initiate button on the page target,
// and capture any /api/generate-automation requests/responses.

const http = require('http');
const WebSocket = require('ws');

const host = process.argv[2] || 'http://127.0.0.1:9222';
let msgId = 1;

function getTargets() {
  return new Promise((resolve, reject) => {
    http.get(host + '/json/list', (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', (err) => reject(err));
  });
}

function sendRaw(ws, payload) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    const msg = Object.assign({ id }, payload);
    ws.send(JSON.stringify(msg), (err) => { if (err) reject(err); else resolve(id); });
  });
}

function send(ws, method, params) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    const payload = { id, method, params };
    ws.send(JSON.stringify(payload));
    const onMessage = (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          ws.removeListener('message', onMessage);
          resolve(msg.result || msg.error);
        }
      } catch (e) {}
    };
    ws.on('message', onMessage);
    setTimeout(() => { ws.removeListener('message', onMessage); reject(new Error('timeout')); }, 8000);
  });
}

(async () => {
  try {
    const targets = await getTargets();
    const extTargets = targets.filter(t => t.url && t.url.startsWith('chrome-extension://'));
    if (!extTargets.length) {
      console.error('No extension targets found.');
      process.exit(2);
    }

    console.log(`Found ${extTargets.length} extension targets:`);
    extTargets.forEach(t => console.log(` - [${t.type}] ${t.title || t.url} -> ${t.webSocketDebuggerUrl}`));

    const conns = [];
    for (const t of extTargets) {
      try {
        const ws = new WebSocket(t.webSocketDebuggerUrl);
        ws._meta = { target: t };
        ws.on('open', async () => {
          console.log('connected to', t.title || t.url);
          // enable domains we may need
          try { await send(ws, 'Network.enable', {}); } catch (e) {}
          try { await send(ws, 'Runtime.enable', {}); } catch (e) {}
          try { await send(ws, 'Console.enable', {}); } catch (e) {}
        });
        ws.on('message', async (data) => {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.method === 'Network.requestWillBeSent') {
              const req = msg.params.request;
              if (req.url && req.url.includes('/api/generate-automation')) {
                console.log(`[${t.type}] Request -> ${req.method} ${req.url}`);
                if (req.postData) console.log('  postData:', req.postData);
              }
            }
            if (msg.method === 'Network.responseReceived') {
              const resp = msg.params.response;
              if (resp.url && resp.url.includes('/api/generate-automation')) {
                console.log(`[${t.type}] Response headers ->`, JSON.stringify(resp.headers, null, 2));
                const requestId = msg.params.requestId;
                try {
                  const bodyRes = await send(ws, 'Network.getResponseBody', { requestId });
                  if (bodyRes && bodyRes.body) {
                    try { const parsed = JSON.parse(bodyRes.body); console.log(`[${t.type}] Response body (JSON):`, JSON.stringify(parsed, null, 2)); }
                    catch (e) { console.log(`[${t.type}] Response body (raw):`, bodyRes.body); }
                  }
                } catch (e) { /* ignore */ }
              }
            }
            if (msg.method === 'Console.messageAdded') {
              const m = msg.params.message;
              console.log(`[${t.type}][console][${m.level}] ${m.text}`);
            }
          } catch (e) { /* ignore parse */ }
        });
        ws.on('error', (err) => console.error('ws err', err));
        conns.push(ws);
      } catch (e) {
        console.warn('failed to connect to', t.webSocketDebuggerUrl, e);
      }
    }

    // find a page target to click Initiate
    const pageTarget = extTargets.find(t => t.type === 'page' && (t.title && t.title.includes('Nexus Fleet') || (t.url && t.url.endsWith('index.html')))) || extTargets.find(t => t.type === 'page');
    if (!pageTarget) {
      console.error('No page target to trigger Initiate.');
      process.exit(3);
    }

    // wait a short while for connections to open
    await new Promise(r => setTimeout(r, 800));

    // attach to page target ws and click
    const pageConn = conns.find(c => c._meta && c._meta.target && c._meta.target.webSocketDebuggerUrl === pageTarget.webSocketDebuggerUrl);
    if (!pageConn) {
      console.error('Failed to find open connection for page target.');
      process.exit(4);
    }

    // click the button via Runtime.evaluate
    const expr = `(() => {
  const input = Array.from(document.querySelectorAll('input')).find(i => i.placeholder && i.placeholder.includes('Tactical Objective'));
  if (input) { input.value = 'Capture plan run'; input.dispatchEvent(new Event('input', { bubbles: true })); }
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && /Initiate/i.test(b.textContent));
  if (btn) { btn.click(); }
  return { clicked: !!btn, foundInput: !!input };
})();`;

    console.log('Triggering Initiate on page target...');
    try {
      await send(pageConn, 'Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    } catch (e) { console.warn('evaluate failed', e); }

    console.log('Monitoring for events for 12s...');
    await new Promise(r => setTimeout(r, 12000));

    console.log('Done, closing connections.');
    conns.forEach(c => c.close());
    process.exit(0);

  } catch (err) {
    console.error('error', err);
    process.exit(1);
  }
})();
