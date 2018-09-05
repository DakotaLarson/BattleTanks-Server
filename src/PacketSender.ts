const sockets = {};

const Packets = {
    ARENA: 0x00,
    GAME_STATUS: 0x01,
    ALERT: 0X02,
    ASSIGNED_INITIAL_SPAWN: 0X03
};

export const sendArena = (id, arena) => {
    let data = constructData(Packets.ARENA, JSON.stringify(arena));
    sockets[id].send(data);
};

export const sendGameStatus = (id, status) => {
    let data = constructData(Packets.GAME_STATUS, status);
    sockets[id].send(data);
};

export const sendAlert = (id, message) => {
    let data = constructData(Packets.ALERT, message);
    sockets[id].send(data);
};

export const sendAssignedInitialSpawn = (id, loc) => {
    let data = constructData(Packets.ASSIGNED_INITIAL_SPAWN, [loc.x, loc.y, loc.z]);
    sockets[id].send(data);
};

export const addSocket = (id, ws) => {
    sockets[id] = ws;
};

export const removeSocket = (id) => {
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
            headerBuffer.writeUInt8(0x01, 1);
            bodyBuffer = Buffer.from(body, 'utf8');
        }else{
            headerBuffer.writeUInt8(0x02, 1);
            bodyBuffer = Buffer.from(body);
        }
        return Buffer.concat([headerBuffer, bodyBuffer], headerBuffer.length + bodyBuffer.length);
    }

};
