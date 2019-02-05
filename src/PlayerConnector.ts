import WebSocket = require("ws");
import Auth from "./Auth";
import DomEventHandler from "./DomEventHandler";
import Player from "./entity/Player";
import EventHandler from "./EventHandler";
import PacketReceiver from "./PacketReceiver";
import * as PacketSender from "./PacketSender";

export default class PlayerConnector {

    private static playerId = 1;

    private static readonly CONNECTION_HEADER_CODE = 0x00;
    private static readonly MAX_NAME_LENGTH = 16;
    private static readonly MAX_PACKET_LENGTH = 2048;

    public static getNextId() {
        return PlayerConnector.playerId ++;
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
        if (buffer.length < PlayerConnector.MAX_PACKET_LENGTH) {
            const header = buffer.readUInt8(0);
            if (header === PlayerConnector.CONNECTION_HEADER_CODE) {
                try {
                    const data = JSON.parse(buffer.toString("utf8", 2));
                    if (data.name.length <= PlayerConnector.MAX_NAME_LENGTH) {
                        if (data.tokenId) {
                            Auth.verifyId(data.tokenId).then((authData: any) => {
                                this.createPlayer(event.target, data.name, authData.id);
                            }).catch(() => {
                                const player = this.createPlayer(event.target, data.name);
                                player.sendAlert("Your account couldn't be verified. Try refreshing the page if you want to save stats.");
                            });
                        } else {
                            this.createPlayer(event.target, data.name);
                        }
                    }
                } catch (ex) {
                    return;
                }
            }
        }
    }

    private createPlayer(ws: WebSocket, name: string, sub?: string) {
        const id = PlayerConnector.getNextId();
        const player = new Player(name, id, sub);

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
        if (player.sub) {
            console.log("Player connected (Auth)");
        } else {
            console.log("Player connected (No Auth)");
        }
        return player;
    }
}
