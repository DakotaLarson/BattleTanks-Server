import { OAuth2Client } from "google-auth-library";
import WebSocket = require("ws");
import DomEventHandler from "./DomEventHandler";
import EventHandler from "./EventHandler";
import PacketReceiver from "./PacketReceiver";
import * as PacketSender from "./PacketSender";
import Player from "./Player";

export default class PlayerConnector {

    private static readonly CONNECTION_HEADER_CODE = 0x00;
    private static readonly MAX_NAME_LENGTH = 16;
    private static readonly MAX_PACKET_LENGTH = 2048;
    private static readonly CLIENT_ID = "42166570332-0egs4928q7kfsnhh4nib3o8hjn62f9u5.apps.googleusercontent.com";

    private playerId: number;

    private oauthClient: OAuth2Client;

    constructor() {
        this.playerId = 1;
        this.oauthClient = new OAuth2Client(PlayerConnector.CLIENT_ID);
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
                            this.verifyId(data.tokenId).then((sub) => {
                                this.createPlayer(event.target, data.name, sub);
                            }).catch(console.log);
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
        const id = this.playerId ++;
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
        if (sub) {
            console.log("Player connected (Auth)");
        } else {
            console.log("Player connected (No Auth)");
        }
    }

    private verifyId(idToken: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.oauthClient.verifyIdToken({
                idToken,
                audience: PlayerConnector.CLIENT_ID,
            }).then((ticket) => {
                const payload =  ticket.getPayload();
                if (payload) {
                    if (payload.aud === PlayerConnector.CLIENT_ID && (payload.iss === "accounts.google.com" || payload.iss === "https://accounts.google.com")) {
                        resolve(payload.sub);
                    }
                }
            }).catch(reject);
        });
    }
}
