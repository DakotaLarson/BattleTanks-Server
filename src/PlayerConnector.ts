import EventHandler from "./EventHandler";
import PacketReceiver from "./PacketReceiver";
import * as PacketSender from "./PacketSender";
import Player from "./Player";

const CONNECTION_HEADER_CODE = 0X00;

let playerID = 1;

export const enable = () => {
    EventHandler.addListener(undefined, EventHandler.Event.WS_CONNECTION_OPENED, onConnection);
};

export const disable = () => {
    EventHandler.removeListener(undefined, EventHandler.Event.WS_CONNECTION_OPENED, onConnection);
};

const onConnection = (ws: WebSocket) => {
    ws.addEventListener("message", checkMessage);
};

const checkMessage = (event: any) => {
    const buffer: Buffer = event.data;
    const header = buffer.readUInt8(0);
    if (header === CONNECTION_HEADER_CODE) {
        const name = buffer.toString("utf8", 2);
        createPlayer(event.target, name);
    }
};

const createPlayer = (ws: WebSocket, name: string) => {
    const id = playerID ++;
    const player = new Player(name, id);

    ws.removeEventListener("message", checkMessage);

    ws.addEventListener("message", (message) => {
        PacketReceiver.handleMessage(message.data, player);
    });
    ws.addEventListener("close", (event) => {
        EventHandler.callEvent(EventHandler.Event.PLAYER_LEAVE, {
            player,
            code: event.code,
            reason: event.reason,
        });
        PacketSender.removeSocket(id);
    });
    ws.addEventListener("error", (error) => {
        console.log(error);
    });

    PacketSender.addSocket(id, ws);

    EventHandler.callEvent(EventHandler.Event.PLAYER_JOIN, player);
};
