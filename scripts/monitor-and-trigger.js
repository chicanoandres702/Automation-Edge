#!/usr/bin/env node
// Monitor extension network traffic and console, then trigger the Initiate button.
const http = require('http');
const WebSocket = require('ws');

const host = process.argv[2] || 'http://127.0.0.1:9222';
let msgId = 1;
const pending = new Map();

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

function send(ws, method, params) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    const payload = { id, method, params };
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify(payload));
  });
}

(async () => {
  try {
    const targets = await getTargets();
    // prefer page target with title matching the extension or index.html
    let target = targets.find(t => t.title && t.title.includes('Nexus Fleet'))
              || targets.find(t => t.url && t.url.includes('chrome-extension://') && t.url.endsWith('index.html'))
              || targets.find(t => t.type === 'page' && t.url && t.url.includes('chrome-extension://'));
    if (!target) {
      console.error('No suitable extension target found. Targets available:');
      console.error(targets.map(t => `${t.type} ${t.title || t.url}`).join('\n'));
      process.exit(2);
    }

    console.log('Attaching to target:', target.title || target.url);
    const wsUrl = target.webSocketDebuggerUrl.replace('ws://127.0.0.1:9222', 'ws://127.0.0.1:9222');
    const ws = new WebSocket(wsUrl);

    ws.on('open', async () => {
      console.log('CDP websocket open');
      // enable Network, Runtime, and Console
      await send(ws, 'Network.enable', {});
      await send(ws, 'Runtime.enable', {});
      await send(ws, 'Console.enable', {});

      console.log('Domains enabled: Network, Runtime, Console');

      // Evaluate script to click Initiate
      const expr = `(() => {
  const input = Array.from(document.querySelectorAll('input')).find(i => i.placeholder && i.placeholder.includes('Tactical Objective'));
  if (input) { input.value = 'Capture plan run'; input.dispatchEvent(new Event('input', { bubbles: true })); }
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && /Initiate/i.test(b.textContent));
  if (btn) { btn.click(); }
  return { clicked: !!btn, foundInput: !!input };
})();`;

      console.log('Triggering Initiate...');
      await send(ws, 'Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      console.log('Initiate triggered; monitoring for /api/generate-automation traffic for 10s...');

      // close after timeout
      setTimeout(() => {
        console.log('Done monitoring, closing.');
        ws.close();
        process.exit(0);
      }, 10000);
    });

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        // handle command responses
        if (msg.id && pending.has(msg.id)) {
          pending.get(msg.id).resolve(msg.result || msg.error);
          pending.delete(msg.id);
          return;
        }
        if (msg.method === 'Console.messageAdded') {
          const m = msg.params.message;
          console.log(`[console][${m.level}] ${m.text}`);
          return;
        }
        if (msg.method === 'Network.requestWillBeSent') {
          const req = msg.params.request;
          if (req.url && req.url.includes('/api/generate-automation')) {
            console.log('[Network] Request ->', req.method, req.url);
            if (req.postData) console.log('  postData:', req.postData);
          }
          return;
        }
        if (msg.method === 'Network.responseReceived') {
          const resp = msg.params.response;
          if (resp.url && resp.url.includes('/api/generate-automation')) {
            console.log('[Network] Response headers ->', JSON.stringify(resp.headers, null, 2));
            // requestId to fetch body
            const requestId = msg.params.requestId;
            try {
              const bodyRes = await send(ws, 'Network.getResponseBody', { requestId });
              if (bodyRes && bodyRes.body) {
                let parsed = bodyRes.body;
                try { parsed = JSON.parse(bodyRes.body); console.log('[Network] Response body (JSON):', JSON.stringify(parsed, null, 2)); }
                catch (e) { console.log('[Network] Response body (raw):', bodyRes.body); }
              }
            } catch (e) {
              // sometimes getResponseBody fails for data URL or CORS targets
              console.warn('Failed to getResponseBody', e?.message || e);
            }
          }
          return;
        }
        // Generic logging for other events
        // Uncomment to debug: console.log('CDP event', msg.method, JSON.stringify(msg.params || {}));
      } catch (e) {
        console.error('Failed to parse ws message', e, data.toString());
      }
    });

    ws.on('error', (err) => console.error('WS error', err));
    ws.on('close', () => { /* closed */ });

  } catch (err) {
    console.error('monitor error', err);
    process.exit(1);
  }
})();
