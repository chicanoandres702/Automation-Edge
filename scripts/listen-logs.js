const WebSocket = require('ws');
const wsUrl = 'ws://localhost:9222/devtools/page/235688BCBF728D84B157DDDF1D677410';
const ws = new WebSocket(wsUrl);

ws.on('open', () => {
    console.log('Connected to Extension Target');
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
    console.log('Listening for logs. Trigger the failure now...');
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.method === 'Runtime.consoleAPICalled') {
        const args = msg.params.args.map(a => a.value || a.description).join(' ');
        console.log(`[CONSOLE ${msg.params.type.toUpperCase()}] ${args}`);
    } else if (msg.method === 'Log.entryAdded') {
        console.log(`[LOG ${msg.params.entry.level.toUpperCase()}] ${msg.params.entry.text}`);
    } else if (msg.id === 1 || msg.id === 2) {
        // Ack
    } else {
        // console.log('DEBUG:', JSON.stringify(msg, null, 2));
    }
});

ws.on('error', (err) => console.error('WS Error:', err));
setTimeout(() => {
    console.log('Timeout. Closing.');
    process.exit(0);
}, 15000);
