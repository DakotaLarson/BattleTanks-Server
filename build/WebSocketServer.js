"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
const EventHandler = require("./EventHandler");
let connectionCheckerId;
exports.enable = () => {
    this.wss = new WebSocket.Server({
        port: 8000,
        verifyClient: verifyClient
    });
    this.wss.on('listening', () => {
        console.log('WSS Listening...');
    });
    this.wss.on('connection', handleConnection);
    connectionCheckerId = setInterval(checkConnections, 30000, 30000);
};
exports.disable = () => {
    this.wss.close();
    clearInterval(connectionCheckerId);
};
const handleConnection = (ws) => {
    ws.isAlive = true;
    ws.addEventListener('pong', () => {
        ws.isAlive = true;
    });
    EventHandler.callEvent(EventHandler.Event.WS_CONNECTION_OPENED, ws);
};
const checkConnections = () => {
    for (let ws of this.wss.clients) {
        if (!ws.isAlive) {
            ws.terminate();
            console.log('WS Terminated...');
        }
        else {
            ws.isAlive = false;
            ws.ping();
        }
    }
};
const verifyClient = (info) => {
    return info.req.headers['sec-websocket-protocol'] === 'tanks-MP';
};
//# sourceMappingURL=WebSocketServer.js.map