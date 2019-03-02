import WebSocket = require("ws");
import Auth from "./Auth";
import DatabaseHandler from "./DatabaseHandler";
import DomEventHandler from "./DomEventHandler";
import Player from "./entity/Player";
import EventHandler from "./EventHandler";
import PacketReceiver from "./PacketReceiver";
import * as PacketSender from "./PacketSender";

export default class PlayerConnector {

    private static playerId = 1;

    private static readonly CONNECTION_HEADER_CODE = 0x00;
    private static readonly MAX_PACKET_LENGTH = 2048;

    private databaseHandler: DatabaseHandler;

    constructor(databaseHandler: DatabaseHandler) {
        this.databaseHandler = databaseHandler;
    }

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
                    const tokenId = buffer.toString("utf8", 2);
                    if (tokenId.length) {
                        Auth.verifyId(tokenId).then((authData: any) => {
                            this.createPlayer(event.target, authData.id);
                        }).catch(() => {
                            this.createPlayer(event.target).then((player) => {
                                player.sendAlert("Your account couldn't be verified. Try refreshing the page if you want to save stats.");
                            }).catch(console.log);
                        });
                    } else {
                        this.createPlayer(event.target);
                    }
                } catch (ex) {
                    return;
                }
            }
        }
    }

    private createPlayer(ws: WebSocket, sub?: string): Promise<Player> {
        return new Promise((resolve, reject) => {
            const id = PlayerConnector.getNextId();
            this.getName(id, sub).then((name) => {
                const player = new Player(name, id, sub);
                DomEventHandler.removeListener(this, ws, "message", this.checkMessage);

                ws.addEventListener("message", (message) => {
                    PacketReceiver.handleMessage(message.data, player);
                });
                ws.addEventListener("close", (event) => {
                    console.log(player.name + " disconnected " + event.code);
                    PacketSender.removeSocket(id);
                    EventHandler.callEvent(EventHandler.Event.PLAYER_LEAVE, player);
                });
                ws.addEventListener("error", (error) => {
                    console.log(error);
                });

                PacketSender.addSocket(id, (ws as any));

                EventHandler.callEvent(EventHandler.Event.PLAYER_JOIN, player);
                console.log(player.name + " conencted!");
                player.sendPlayerName();
                resolve(player);
            }).catch(reject);
        });

    }

    private getName(id: number, sub?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (sub) {
                this.databaseHandler.getPlayerUsername(sub).then(resolve).catch(reject);
            } else {
                resolve("Guest #" + id);
            }
        });
    }
}
