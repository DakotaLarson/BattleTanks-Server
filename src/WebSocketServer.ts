import WebSocket = require("ws");

import EventHandler from "./EventHandler";
import WebServer from "./WebServer";

let connectionCheckerId: NodeJS.Timer;

let wss: WebSocket.Server;

const deadSockets: WebSocket[] = new Array();

export const enable = () => {

    const webServer = new WebServer();
    webServer.start();

    wss = new WebSocket.Server({
        server: webServer.server,
        verifyClient,
    } as WebSocket.ServerOptions);
    wss.on("listening", () => {
        console.log("WSS Listening...");
    });
    wss.on("connection", handleConnection);

    connectionCheckerId = setInterval(checkConnections, 30000, 30000);

};

export const disable = () => {
    wss.close();
    clearInterval(connectionCheckerId);
};

const handleConnection = (ws: WebSocket) => {
    ws.addEventListener("pong", () => {
        const socketIndex = deadSockets.indexOf(ws);
        if (socketIndex > -1) {
            deadSockets.splice(socketIndex, 1);
        }
    });

    EventHandler.callEvent(EventHandler.Event.WS_CONNECTION_OPENED, ws);
};

const checkConnections = () => {
    for (const ws of wss.clients) {
        const socketIndex = deadSockets.indexOf(ws);
        if (socketIndex > -1) {
            ws.terminate();
            deadSockets.splice(socketIndex, 1);
            console.log("WS Terminated...");
        } else {
            ws.ping();
        }
    }
};

const verifyClient = (info: any) => {
    return info.req.headers["sec-websocket-protocol"] === "tanks-MP";
};
