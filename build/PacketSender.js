"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sockets = new Map();
var Packet;
(function (Packet) {
    Packet[Packet["ARENA"] = 0] = "ARENA";
    Packet[Packet["GAME_STATUS"] = 1] = "GAME_STATUS";
    Packet[Packet["ALERT"] = 2] = "ALERT";
    Packet[Packet["ASSIGNED_INITIAL_SPAWN"] = 3] = "ASSIGNED_INITIAL_SPAWN";
    Packet[Packet["CONNECTED_PLAYER_INITIAL_SPAWN"] = 4] = "CONNECTED_PLAYER_INITIAL_SPAWN";
    Packet[Packet["CONNECTED_PLAYER_POSITION_UPDATE"] = 5] = "CONNECTED_PLAYER_POSITION_UPDATE";
})(Packet || (Packet = {}));
;
var DataType;
(function (DataType) {
    DataType[DataType["NUMBER"] = 0] = "NUMBER";
    DataType[DataType["STRING"] = 1] = "STRING";
    DataType[DataType["INT_ARRAY"] = 2] = "INT_ARRAY";
    DataType[DataType["FLOAT_ARRAY"] = 3] = "FLOAT_ARRAY";
    DataType[DataType["FLOAT_ARRAY_INT_HEADER"] = 4] = "FLOAT_ARRAY_INT_HEADER";
})(DataType || (DataType = {}));
;
exports.sendArena = (id, arena) => {
    let data = constructData(Packet.ARENA, JSON.stringify(arena), DataType.STRING);
    sockets.get(id).send(data);
};
exports.sendGameStatus = (id, status) => {
    let data = constructData(Packet.GAME_STATUS, status, DataType.NUMBER);
    sockets.get(id).send(data);
};
exports.sendAlert = (id, message) => {
    let data = constructData(Packet.ALERT, message, DataType.STRING);
    sockets.get(id).send(data);
};
exports.sendAssignedInitialSpawn = (id, pos) => {
    let dataObj = {
        id: id,
        pos: [pos.x, pos.y, pos.z]
    };
    let data = constructData(Packet.ASSIGNED_INITIAL_SPAWN, JSON.stringify(dataObj), DataType.STRING);
    sockets.get(id).send(data);
};
exports.sendConnectedPlayerInitialSpawn = (id, playerData) => {
    playerData;
    let data = constructData(Packet.CONNECTED_PLAYER_INITIAL_SPAWN, JSON.stringify(playerData), DataType.STRING);
    sockets.get(id).send(data);
};
exports.sendConnectedPlayerPositionUpdate = (id, pos, bodyRot, headRot, playerId) => {
    let data = constructData(Packet.CONNECTED_PLAYER_POSITION_UPDATE, [pos.x, pos.y, pos.z, bodyRot, headRot], DataType.FLOAT_ARRAY_INT_HEADER, playerId);
    sockets.get(id).send(data);
};
exports.addSocket = (id, ws) => {
    sockets.set(id, ws);
};
exports.removeSocket = (id) => {
    sockets.delete(id);
};
const constructData = (header, body, dataType, additionalHeader) => {
    let headerBuffer;
    if (dataType === DataType.FLOAT_ARRAY || dataType === DataType.FLOAT_ARRAY_INT_HEADER) {
        headerBuffer = Buffer.alloc(4);
    }
    else {
        headerBuffer = Buffer.alloc(2);
    }
    headerBuffer.writeUInt8(header, 0);
    headerBuffer.writeUInt8(dataType, 1);
    let buffer;
    switch (dataType) {
        case DataType.NUMBER:
            buffer = Buffer.alloc(1);
            buffer.writeUInt8(body, 0);
            break;
        case DataType.STRING:
            buffer = Buffer.from(body, 'utf8');
            break;
        case DataType.INT_ARRAY:
            buffer = Buffer.alloc(body.length);
            for (let i = 0; i < body.length; i += 1) {
                buffer.writeUInt8(body[i], i);
            }
            break;
        case DataType.FLOAT_ARRAY:
            buffer = Buffer.alloc(body.length * 4);
            for (let i = 0; i < body.length; i += 4) {
                buffer.writeFloatLE(body[i], i);
            }
            break;
        case DataType.FLOAT_ARRAY_INT_HEADER:
            headerBuffer.writeUInt8(additionalHeader, 2);
            buffer = Buffer.alloc(body.length * 4);
            for (let i = 0; i < body.length; i += 1) {
                buffer.writeFloatLE(body[i], i * 4);
            }
            break;
    }
    return Buffer.concat([headerBuffer, buffer], headerBuffer.length + buffer.length);
};
//# sourceMappingURL=PacketSender.js.map