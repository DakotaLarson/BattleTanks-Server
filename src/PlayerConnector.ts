import WebSocket = require("ws");
import DomEventHandler from "./DomEventHandler";
import EventHandler from "./EventHandler";
import PacketReceiver from "./PacketReceiver";
import * as PacketSender from "./PacketSender";
import Player from "./Player";

export default class PlayerConnector {

    private static readonly CONNECTION_HEADER_CODE = 0x00;
    private static readonly MAX_NAME_LENGTH = 16;

    private playerId: number;

    constructor() {
        this.playerId = 1;
    }

    public start() {
        EventHandler.addListener(this, EventHandler.Event.WS_CONNECTION_OPENED, this.onConnection);
    }

    public stop() {
        EventHandler.removeListener(this, EventHandler.Event.WS_CONNECTION_OPENED, this.onConnection);
    }

    private onConnection(ws: WebSocket) {
        DomEventHandler.addListener(this, ws, "message", this.checkMessage);
    }

    private checkMessage(event: any) {
        const buffer: Buffer = event.data;
        const header = buffer.readUInt8(0);
        if (header === PlayerConnector.CONNECTION_HEADER_CODE) {
            const name = buffer.toString("utf8", 2);
            if (name.length <= PlayerConnector.MAX_NAME_LENGTH) {
                this.createPlayer(event.target, name);
            }
        }
    }

    private createPlayer = (ws: WebSocket, name: string) => {
        const id = this.playerId ++;
        const player = new Player(name, id);

        DomEventHandler.removeListener(this, ws, "message", this.checkMessage);

        ws.addEventListener("message", (message) => {
            PacketReceiver.handleMessage(message.data, player);
        });
        ws.addEventListener("close", (event) => {
            console.log("Player disconnected " + event.code);
            PacketSender.removeSocket(id);
            EventHandler.callEvent(EventHandler.Event.PLAYER_LEAVE, player);
        });
        ws.addEventListener("error", (error) => {
            console.log(error);
        });

        PacketSender.addSocket(id, (ws as any));

        EventHandler.callEvent(EventHandler.Event.PLAYER_JOIN, player);
        console.log("Player connected");
    }
}
