"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sockets = {};
var Packets;
(function (Packets) {
    Packets[Packets["ARENA"] = 0] = "ARENA";
    Packets[Packets["GAME_STATUS"] = 1] = "GAME_STATUS";
    Packets[Packets["ALERT"] = 2] = "ALERT";
    Packets[Packets["ASSIGNED_INITIAL_SPAWN"] = 3] = "ASSIGNED_INITIAL_SPAWN";
})(Packets || (Packets = {}));
;
var DataType;
(function (DataType) {
    DataType[DataType["NUMBER"] = 0] = "NUMBER";
    DataType[DataType["STRING"] = 1] = "STRING";
    DataType[DataType["ARRAY"] = 2] = "ARRAY";
})(DataType || (DataType = {}));
exports.sendArena = (id, arena) => {
    let data = constructData(Packets.ARENA, JSON.stringify(arena));
    sockets[id].send(data);
};
exports.sendGameStatus = (id, status) => {
    let data = constructData(Packets.GAME_STATUS, status);
    sockets[id].send(data);
};
exports.sendAlert = (id, message) => {
    let data = constructData(Packets.ALERT, message);
    sockets[id].send(data);
};
exports.sendAssignedInitialSpawn = (id, loc) => {
    let data = constructData(Packets.ASSIGNED_INITIAL_SPAWN, [loc.x, loc.y, loc.z]);
    sockets[id].send(data);
};
exports.addSocket = (id, ws) => {
    sockets[id] = ws;
};
exports.removeSocket = (id) => {
    delete sockets[id];
};
const constructData = (header, body) => {
    let bodyType = typeof body;
    if (bodyType === 'number') {
        let buffer = Buffer.alloc(3);
        buffer.writeUInt8(header, 0);
        buffer.writeUInt8(DataType.NUMBER, 1);
        buffer.writeUInt8(body, 2);
        return buffer;
    }
    else {
        let headerBuffer = Buffer.alloc(2);
        headerBuffer.writeUInt8(header, 0);
        headerBuffer.writeUInt8(0x01, 1);
        let bodyBuffer;
        if (bodyType === 'string') {
            headerBuffer.writeUInt8(DataType.STRING, 1);
            bodyBuffer = Buffer.from(body, 'utf8');
        }
        else {
            headerBuffer.writeUInt8(DataType.ARRAY, 1);
            bodyBuffer = Buffer.from(body);
        }
        return Buffer.concat([headerBuffer, bodyBuffer], headerBuffer.length + bodyBuffer.length);
    }
};
//# sourceMappingURL=PacketSender.js.map