import EventHandler from './EventHandler';
import Player from './Player';
import PacketReceiver from './PacketReceiver';
import * as PacketSender from './PacketSender';

const CONNECTION_HEADER_CODE = 0X00;

let playerID = 1;

export const enable = () => {
    EventHandler.addListener(this, EventHandler.Event.WS_CONNECTION_OPENED, onConnection);
};

export const disable = () => {
    EventHandler.removeListener(this, EventHandler.Event.WS_CONNECTION_OPENED, onConnection);
};

const onConnection = (ws) => {
    ws.addEventListener('message', checkMessage);
};

const checkMessage = (event) => {
    let buffer: Buffer = event.data;
    let header = buffer.readUInt8(0);
    if(header === CONNECTION_HEADER_CODE){
        let name = buffer.toString('utf8', 2);
        createPlayer(event.target, name);
    }
};

const createPlayer = (ws: WebSocket, name: String) => {
    let id = playerID ++;
    let player = new Player(name, id);

    ws.removeEventListener('message', checkMessage);

    ws.addEventListener('message', (message) => {
        PacketReceiver.handleMessage(message.data, player);
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
