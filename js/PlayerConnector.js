const EventHandler = require('./EventHandler');
const Player = require('./Player');
const PacketReceiver = require('./PacketReceiver');
const PacketSender = require('./PacketSender');

const CONNECTION_HEADER_CODE = 0X00;

let playerID = 0;

module.exports.enable = () => {
    EventHandler.addListener(EventHandler.Event.WS_CONNECTION_OPENED, onConnection);
};

module.exports.disable = () => {
    EventHandler.removeListener(EventHandler.Event.WS_CONNECTION_OPENED, onConnection);
};

onConnection = (ws) => {
    ws.addEventListener('message', checkMessage);
};

checkMessage = (event) => {
    let buffer = event.data;
    let header = buffer.readUInt8(0);
    if(header === CONNECTION_HEADER_CODE){
        let name = buffer.toString('utf8', 1);
        createPlayer(event.target, name);
    }
};

createPlayer = (ws, name) => {
    let id = playerID ++;
    let player = new Player(name, id);

    ws.removeEventListener('message', checkMessage);

    ws.addEventListener('message', (message) => {
        PacketReceiver.handleMessage(message, player);
    });
    ws.addEventListener('close', (event) => {
        EventHandler.callEvent(EventHandler.Event.PLAYER_DISCONNECT, {
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

    EventHandler.callEvent(EventHandler.Event.PLAYER_CONNECT, player);
};
