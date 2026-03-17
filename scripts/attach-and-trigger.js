#!/usr/bin/env node
// Connect to a running Edge/Chrome remote-debugging instance, find the
// extension page (index.html) target, and evaluate a small script that
// fills the prompt and clicks the "Initiate" button.

const http = require('http');
const WebSocket = require('ws');

const host = process.argv[2] || 'http://127.0.0.1:9223';
const maxRetries = 30;
const delayMs = 1000;

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

(async () => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const targets = await getTargets();
      // Prefer page target whose url ends with index.html
      let target = targets.find(t => t.url && t.url.includes('chrome-extension://') && t.url.endsWith('index.html'));
      // Fallback: match by extension name in title
      if (!target) target = targets.find(t => t.title && t.title.includes('Automaton Deep Agent'));
      // Fallback: any chrome-extension page
      if (!target) target = targets.find(t => t.url && t.url.includes('chrome-extension://') && t.type === 'page');

      if (!target) {
        process.stdout.write('.');
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }

      console.log('\nFound target: ', target.title || target.url);
      console.log('webSocketDebuggerUrl:', target.webSocketDebuggerUrl);

      const ws = new WebSocket(target.webSocketDebuggerUrl);
      ws.on('open', () => {
        const expr = `(() => {
  const input = Array.from(document.querySelectorAll('input')).find(i => i.placeholder && i.placeholder.includes('Tactical Objective'));
  if (input) { input.value = 'Open example.com'; input.dispatchEvent(new Event('input', { bubbles: true })); }
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && /Initiate/i.test(b.textContent));
  if (btn) { btn.click(); }
  return { clicked: !!btn, foundInput: !!input };
})();`;
        const msg = { id: 1, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: true, returnByValue: true } };
        ws.send(JSON.stringify(msg));
      });

      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          console.log('CDP response:', JSON.stringify(parsed, null, 2));
        } catch (e) { console.log('raw:', data.toString()); }
        process.exit(0);
      });

      ws.on('error', (err) => { console.error('ws error', err); process.exit(1); });
      ws.on('close', () => { /* ignore */ });
      return;
    } catch (e) {
      process.stdout.write('.');
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  console.error('\nTimed out waiting for DevTools targets');
  process.exit(2);
})();
