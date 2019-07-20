import WebSocket = require("ws");

import DatabaseHandler from "./database/DatabaseHandler";
import DomEventHandler from "./DomEventHandler";
import EventHandler from "./EventHandler";
import MetricsHandler from "./MetricsHandler";
import StoreHandler from "./StoreHandler";
import WebServer from "./WebServer";

export default class WebSocketServer {

    private static readonly PROTOCOL_PREFIX = "battletanks-";
    private static readonly SERVER_VERSION = 1.8;

    private static readonly CLIENT_OUTDATED_CODE = 4001;
    private static readonly SERVER_OUTDATED_CODE = 4002;

    private connectionCheckerId: NodeJS.Timer;

    private webServer: WebServer;
    private wss: WebSocket.Server;

    private deadSockets: WebSocket[];

    constructor(databaseHandler: DatabaseHandler, metricsHandler: MetricsHandler, storeHandler: StoreHandler) {
        this.connectionCheckerId = setInterval(this.checkConnections.bind(this), 30000, 30000);

        this.webServer = new WebServer(databaseHandler, metricsHandler, storeHandler);
        this.wss = new WebSocket.Server({
            server: this.webServer.server,
            verifyClient: this.verifyClient.bind(this),
        } as WebSocket.ServerOptions);
        this.wss.on("listening", () => {
            console.log("WSS Listening...");
        });
        this.wss.on("connection", this.handleConnection.bind(this));

        this.deadSockets = [];
    }

    public enable() {
        this.webServer.enable();
    }

    public stop() {
        this.wss.close();
        clearInterval(this.connectionCheckerId);
    }

    private handleConnection(ws: WebSocket) {
        const statusCode = this.verifyVersion(ws.protocol);
        if (statusCode) {
            ws.close(statusCode);
        } else {
            DomEventHandler.addListener(this, ws, "pong", () => {
                const socketIndex = this.deadSockets.indexOf(ws);
                if (socketIndex > -1) {
                    this.deadSockets.splice(socketIndex, 1);
                }
            });
            EventHandler.callEvent(EventHandler.Event.WS_CONNECTION_OPENED, ws);
        }
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
        try {
            return info.req.headers["sec-websocket-protocol"].startsWith(WebSocketServer.PROTOCOL_PREFIX);
        } catch (ex) {
            return false;
        }
    }

    private verifyVersion(protocol: string) {
        try {
            const clientVersion = parseFloat(protocol.split("-")[1]);
            if (isNaN(clientVersion)) {
                return 4000;
            } else if (clientVersion > WebSocketServer.SERVER_VERSION) {
                return WebSocketServer.SERVER_OUTDATED_CODE;
            } else if (clientVersion < WebSocketServer.SERVER_VERSION) {
                return WebSocketServer.CLIENT_OUTDATED_CODE;
            } else {
                return 0;
            }
        } catch (ex) {
            return 4000;
        }
    }
}
