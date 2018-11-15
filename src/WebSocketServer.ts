import WebSocket = require("ws");

import DomEventHandler from "./DomEventHandler";
import EventHandler from "./EventHandler";
import WebServer from "./WebServer";

export default class WebSocketServer {
    private connectionCheckerId: NodeJS.Timer;

    private webServer: WebServer;
    private wss: WebSocket.Server;

    private deadSockets: WebSocket[];

    constructor() {
        this.connectionCheckerId = setInterval(this.checkConnections.bind(this), 30000, 30000);

        this.webServer = new WebServer();
        this.wss = new WebSocket.Server({
            server: this.webServer.server,
            verifyClient: this.verifyClient,
        } as WebSocket.ServerOptions);
        this.wss.on("listening", () => {
            console.log("WSS Listening...");
        });
        this.wss.on("connection", this.handleConnection.bind(this));

        this.deadSockets = [];
    }

    public start() {
        this.webServer.start();
    }

    public stop() {
        this.wss.close();
        clearInterval(this.connectionCheckerId);
    }

    private handleConnection(ws: WebSocket) {
        DomEventHandler.addListener(this, ws, "pong", () => {
            const socketIndex = this.deadSockets.indexOf(ws);
            if (socketIndex > -1) {
                this.deadSockets.splice(socketIndex, 1);
            }
        });

        EventHandler.callEvent(EventHandler.Event.WS_CONNECTION_OPENED, ws);
    }

    private checkConnections() {
        for (const ws of this.wss.clients) {
            const socketIndex = this.deadSockets.indexOf(ws);
            if (socketIndex > -1) {
                ws.terminate();
                this.deadSockets.splice(socketIndex, 1);
                console.log("WS Terminated...");
            } else {
                if (ws.readyState !== ws.OPEN) {
                    console.warn("socket is closed, but not removed.");
                    ws.terminate();
                } else {
                    ws.ping();
                    this.deadSockets.push(ws);
                }
            }
        }
    }

    private verifyClient(info: any) {
        return info.req.headers["sec-websocket-protocol"] === "tanks-MP";
    }
}
