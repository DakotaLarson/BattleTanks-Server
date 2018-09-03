"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventHandler = require("./EventHandler");
const Player_1 = require("./Player");
const PacketReceiver = require("./PacketReceiver");
const PacketSender = require("./PacketSender");
const CONNECTION_HEADER_CODE = 0X00;
let playerID = 0;
exports.enable = () => {
    EventHandler.addListener(EventHandler.Event.WS_CONNECTION_OPENED, onConnection);
};
exports.disable = () => {
    EventHandler.removeListener(EventHandler.Event.WS_CONNECTION_OPENED, onConnection);
};
const onConnection = (ws) => {
    ws.addEventListener('message', checkMessage);
};
const checkMessage = (event) => {
    let buffer = event.data;
    let header = buffer.readUInt8(0);
    if (header === CONNECTION_HEADER_CODE) {
        let name = buffer.toString('utf8', 1);
        createPlayer(event.target, name);
    }
};
const createPlayer = (ws, name) => {
    let id = playerID++;
    let player = new Player_1.default(name, id);
    ws.removeEventListener('message', checkMessage);
    ws.addEventListener('message', (message) => {
        PacketReceiver.handleMessage(message, player);
    });
    ws.addEventListener('close', (event) => {
        EventHandler.callEvent(EventHandler.Event.PLAYER_LEAVE, {
            player: player,
            code: event.code,
            reason: event.reason
        });
        PacketSender.removeSocket(id);
    });
    ws.addEventListener('error', (error) => {
        console.log(error);
    });
    PacketSender.addSocket(id, ws);
    EventHandler.callEvent(EventHandler.Event.PLAYER_JOIN, player);
};
//# sourceMappingURL=PlayerConnector.js.map