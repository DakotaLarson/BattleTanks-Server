const sockets = {};

const Packets = {
    ARENA: 0x00,
    GAME_STATUS: 0x01,
    ALERT: 0X02,
};

module.exports.sendArena = (id, arena) => {
    let data = constructData(Packets.ARENA, JSON.stringify(arena));
    sockets[id].send(data);
};

module.exports.sendGameStatus = (id, status) => {
    let data = constructData(Packets.GAME_STATUS, status);
    sockets[id].send(data);
};

module.exports.sendAlert = (id, message) => {
    let data = constructData(Packets.ALERT, message);
    sockets[id].send(data);
};

module.exports.addSocket = (id, ws) => {
    sockets[id] = ws;
};

module.exports.removeSocket = (id) => {
   delete sockets[id];
};

const constructData = (header, body) => {
    let bodyType = typeof body;
    if(bodyType === 'number'){
        let buffer = Buffer.alloc(3);
        buffer.writeUInt8(header, 0);
        buffer.writeUInt8(0x00, 1);
        buffer.writeUInt8(body, 2);
        return buffer;
    }else{
        let headerBuffer = Buffer.alloc(2);
        headerBuffer.writeUInt8(header, 0);
        headerBuffer.writeUInt8(0x01, 1);

        let bodyBuffer;
        if(bodyType === 'string'){
            bodyBuffer = Buffer.from(body, 'utf8');
        }else{
            bodyBuffer = Buffer.from(body);
        }
        return Buffer.concat([headerBuffer, bodyBuffer], headerBuffer.length + bodyBuffer.length);
    }

};
