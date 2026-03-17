#!/usr/bin/env node
const http = require('http');
const WebSocket = require('ws');

const host = process.argv[2] || 'http://127.0.0.1:9222';
function fetchJson(url){return new Promise((res,rej)=>{http.get(url, r=>{let d=''; r.on('data',c=>d+=c); r.on('end',()=>{try{res(JSON.parse(d));}catch(e){rej(e);}})}).on('error',rej)});}

function redact(str){
  if (!str || typeof str !== 'string') return str;
  // redact Google API keys that start with AIza
  str = str.replace(/AIza[0-9A-Za-z_-]{10,}/g, '[REDACTED_API_KEY]');
  // redact common key patterns like "ai_api_key":"..."
  str = str.replace(/("ai_api_key"\s*:\s*")([^"]+)(")/gi, '$1[REDACTED]$3');
  return str;
}

function prettyTime(){return new Date().toISOString();}

(async function main(){
  try{
    const list = await fetchJson(host + '/json');
    const ext = list.find(t => t && t.url && t.url.startsWith('chrome-extension://'));
    if(!ext){
      console.error('No chrome-extension target found at', host + '/json');
      process.exit(2);
    }
    console.log(prettyTime(), 'Found target:', ext.title, '->', ext.webSocketDebuggerUrl);
    const ws = new WebSocket(ext.webSocketDebuggerUrl);
    ws.on('open', () => {
      console.log(prettyTime(), 'Connected. Enabling Runtime, Log, Network, Page.');
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Network.enable' }));
      ws.send(JSON.stringify({ id: 4, method: 'Page.enable' }));
      ws.send(JSON.stringify({ id: 5, method: 'Runtime.runIfWaitingForDebugger' }));
    });

    ws.on('message', (data) => {
      try{
        const msg = JSON.parse(data.toString());
        if(msg.method){
          const method = msg.method;
          const p = msg.params || {};
          if (method === 'Runtime.consoleAPICalled'){
            const type = p.type;
            const args = (p.args || []).map(a => {
              const v = a.value !== undefined ? a.value : (a.description || JSON.stringify(a));
              return redact(String(v));
            }).join(' ');
            console.log(`${prettyTime()} [console.${type}] ${args}`);
          } else if (method === 'Runtime.exceptionThrown'){
            const ex = JSON.stringify(p.exceptionDetails || p, null, 2);
            console.log(`${prettyTime()} [exception] ${redact(ex)}`);
          } else if (method.startsWith('Network.')){
            if (method === 'Network.requestWillBeSent'){
              const req = p.request || {};
              console.log(`${prettyTime()} [Network.request] ${req.method || ''} ${redact(req.url || '')}`);
            } else if (method === 'Network.responseReceived'){
              const r = p.response || {};
              console.log(`${prettyTime()} [Network.response] ${r.status || ''} ${redact(r.url || '')}`);
            }
          }
        }
      }catch(e){
        console.error(prettyTime(), 'Failed to parse message', e);
      }
    });

    ws.on('close', (code, reason) => {
      console.log(prettyTime(), 'WebSocket closed:', code, reason);
      process.exit(0);
    });
    ws.on('error', (err) => {
      console.error(prettyTime(), 'WebSocket error:', err);
    });
  }catch(err){
    console.error('Fatal:', err);
    process.exit(1);
  }
})();
