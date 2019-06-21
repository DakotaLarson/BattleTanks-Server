import WebSocket = require("ws");
import Auth from "./Auth";
import DatabaseHandler from "./database/DatabaseHandler";
import DomEventHandler from "./DomEventHandler";
import Player from "./entity/Player";
import EventHandler from "./EventHandler";
import PacketReceiver from "./PacketReceiver";
import * as PacketSender from "./PacketSender";
import StoreHandler from "./StoreHandler";

export default class PlayerConnector {

    private static readonly CONNECTION_HEADER_CODE = 0x00;
    private static readonly MAX_PACKET_LENGTH = 2048;

    private static playerId = 1;

    private databaseHandler: DatabaseHandler;
    private storeHandler: StoreHandler;

    constructor(databaseHandler: DatabaseHandler, storeHandler: StoreHandler) {
        this.databaseHandler = databaseHandler;
        this.storeHandler = storeHandler;
    }

    public static getNextId() {
        return PlayerConnector.playerId ++;
    }

    public enable() {
        EventHandler.addListener(this, EventHandler.Event.WS_CONNECTION_OPENED, this.onConnection);
    }

    // public disable() {
    //     EventHandler.removeListener(this, EventHandler.Event.WS_CONNECTION_OPENED, this.onConnection);
    // }

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

    private async createPlayer(ws: WebSocket, sub?: string): Promise<Player> {
        const id = PlayerConnector.getNextId();
        const name = await this.getName(id, sub);
        const modelData = await this.getModelDetails(sub);
        const player = new Player(name, id, modelData.tank, modelData.colors, sub);
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
        console.log(player.name + " connected!");
        player.sendPlayerName();

        return player;
    }

    private async getName(id: number, sub?: string): Promise<string> {
        let name;
        if (sub) {
            name = await this.databaseHandler.getPlayerUsername(sub);
        } else {
            name = "Guest #" + id;
        }

        return name;
    }

    private async getModelDetails(sub?: string) {
        let modelData;
        if (sub) {
            modelData = await this.storeHandler.getPlayerCurrentSelection(sub);
        } else {
            modelData = {
                tank: Player.DEFAULT_TANK,
                colors: Player.DEFAULT_COLORS,
            };
        }

        return modelData;
    }
}
