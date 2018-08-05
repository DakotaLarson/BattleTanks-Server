const sockets = {};

const Packets = {
    ARENA: 0x00,
};

module.exports.sendArena = (id, arena) => {
    let data = constructData(Packets.ARENA, JSON.stringify(arena));
    sockets[id].send(data);
};

module.exports.addSocket = (id, ws) => {
    sockets[id] = ws;
};

module.exports.removeSocket = (id) => {
   delete sockets[id];
};

constructData = (header, body) => {
    let headerBuffer = Buffer.alloc(1, header);
    let bodyBuffer = Buffer.from(body, 'utf8');
    return Buffer.concat([headerBuffer, bodyBuffer], headerBuffer.length + bodyBuffer.length);
};
