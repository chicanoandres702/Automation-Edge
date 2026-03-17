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
          const s = Buffer.concat(chunks).toString();
          resolve(JSON.parse(s));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function findTargetByExtensionId(list, extId) {
  for (const entry of list) {
    if (!entry) continue;
    if (entry.url && entry.url.includes(extId)) return entry;
    if (entry.id && entry.id === extId) return entry;
  }
  return null;
}

function prettyTime() {
  return new Date().toISOString();
}

async function main() {
  const argv = process.argv.slice(2);
  let extId = null;
  let wsUrl = null;
  argv.forEach(a => {
    if (a.startsWith('--id=')) extId = a.slice(5);
    if (a.startsWith('--ws=')) wsUrl = a.slice(5);
    if (a.startsWith('--url=')) wsUrl = a.slice(6);
  });

  if (!wsUrl && !extId) {
    console.error('Usage: node scripts/attach-devtools.js --id=<extensionId>  OR --ws=<webSocketDebuggerUrl>');
    process.exit(2);
  }

  if (!wsUrl) {
    const list = await fetchJson('http://127.0.0.1:9222/json');
    const target = findTargetByExtensionId(list, extId);
    if (!target) {
      console.error('Extension target not found in http://127.0.0.1:9222/json');
      console.error('Available targets (first 20):');
      list.slice(0, 20).forEach(t => console.error(JSON.stringify({id: t.id, title: t.title, url: t.url, ws: t.webSocketDebuggerUrl}))); 
      process.exit(3);
    }
    wsUrl = target.webSocketDebuggerUrl;
    console.log(`${prettyTime()} Found target: ${target.title} -> ${wsUrl}`);
  }

  console.log(`${prettyTime()} Connecting to ${wsUrl} ...`);
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  function send(method, params) {
    const id = nextId++;
    const msg = { id, method };
    if (params) msg.params = params;
    ws.send(JSON.stringify(msg));
    return id;
  }

  ws.on('open', () => {
    console.log(`${prettyTime()} WebSocket open. Enabling Runtime, Log, Network, Page.`);
    send('Runtime.enable');
    send('Log.enable');
    send('Network.enable');
    send('Page.enable');
    // Turn on console messages for evaluations
    send('Runtime.runIfWaitingForDebugger');
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.method) {
        const method = msg.method;
        const p = msg.params || {};
        if (method === 'Runtime.consoleAPICalled') {
          const type = p.type;
          const args = (p.args || []).map(a => a.value !== undefined ? a.value : (a.description || JSON.stringify(a))).join(' ');
          console.log(`${prettyTime()} [console.${type}] ${args}`);
        } else if (method === 'Runtime.exceptionThrown') {
          console.log(`${prettyTime()} [exception]`, JSON.stringify(p.exceptionDetails || p, null, 2));
        } else if (method.startsWith('Network.')) {
          // simple Network event summaries
          if (method === 'Network.requestWillBeSent') {
            const req = p.request || {};
            console.log(`${prettyTime()} [Network.request] ${req.method || ''} ${req.url || ''}`);
          } else if (method === 'Network.responseReceived') {
            const r = p.response || {};
            console.log(`${prettyTime()} [Network.response] ${r.status || ''} ${r.url || ''}`);
          } else if (method === 'Network.loadingFinished') {
            console.log(`${prettyTime()} [Network.loadingFinished] ${p.requestId || ''}`);
          } else {
            // other network events - skip verbose
          }
        } else {
          // Generic event, keep concise
          // console.log(`${prettyTime()} [event] ${method} ${JSON.stringify(p)}`);
        }
      } else if (msg.id) {
        // responses to our commands
        // console.log(`${prettyTime()} [response] id=${msg.id} `, JSON.stringify(msg.result || msg.error || {}));
      }
    } catch (err) {
      console.error(`${prettyTime()} Failed to parse message:`, err);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`${prettyTime()} WebSocket closed: ${code} ${reason}`);
    process.exit(0);
  });

  ws.on('error', (err) => {
    console.error(`${prettyTime()} WebSocket error:`, err);
  });
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
