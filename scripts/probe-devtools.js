#!/usr/bin/env node
const http = require('http');
const WebSocket = require('ws');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function isExtensionTarget(entry) {
  if (!entry) return false;
  if (entry.url && entry.url.startsWith('chrome-extension://')) return true;
  if (entry.title && entry.title.startsWith('chrome-extension://')) return true;
  return false;
}

function probeWs(wsUrl, timeout = 3000) {
  return new Promise((resolve) => {
    let done = false;
    let timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve({ wsUrl, status: 'timeout' });
    }, timeout);

    try {
      const ws = new WebSocket(wsUrl);
      ws.on('open', () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { ws.close(); } catch (e) {}
        resolve({ wsUrl, status: 'open' });
      });
      ws.on('error', (err) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve({ wsUrl, status: 'error', error: err.message });
      });
      ws.on('close', (code, reason) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve({ wsUrl, status: 'closed', code, reason });
      });
    } catch (err) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ wsUrl, status: 'exception', error: err.message });
    }
  });
}

async function main() {
  try {
    const list = await fetchJson('http://127.0.0.1:9222/json');
    const extTargets = list.filter(isExtensionTarget);
    if (!extTargets.length) {
      console.log('No chrome-extension targets found in remote debugging list.');
      process.exit(0);
    }
    console.log(`Found ${extTargets.length} extension targets; probing WebSocket handshakes (3s timeout each)...`);
    const results = [];
    for (const t of extTargets) {
      const ws = t.webSocketDebuggerUrl;
      process.stdout.write(`Probing ${t.id || '-'} ${t.title || ''} -> ${ws} ... `);
      const r = await probeWs(ws, 3000);
      console.log(r.status + (r.error ? ` (${r.error})` : ''));
      results.push({ id: t.id, title: t.title, url: t.url, ws, status: r.status, error: r.error || null });
    }
    console.log('\nSummary:');
    results.forEach(r => console.log(`${r.id} | ${r.title} | ${r.url} | ${r.ws} => ${r.status}${r.error ? ' - ' + r.error : ''}`));
  } catch (err) {
    console.error('Failed to probe remote debugging endpoint:', err.message || err);
    process.exit(2);
  }
}

main();
