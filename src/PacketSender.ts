import Vector3 from "./Vector3";

const sockets: Map<number, WebSocket> = new Map();

enum Packet{
    ARENA,

    GAME_STATUS,

    ALERT,

    PLAYER_ADD,
    PLAYER_MOVE,
    PLAYER_REMOVE,

    CONNECTED_PLAYER_ADD,
    CONNECTED_PLAYER_MOVE,
    CONNECTED_PLAYER_REMOVE,

    MATCH_STATISTICS
};

enum DataType{
    NUMBER = 0X00,
    STRING = 0X01,
    INT_ARRAY = 0x02,
    FLOAT_ARRAY = 0X03,
    FLOAT_ARRAY_INT_HEADER = 0X04
};

export const sendArena = (id, arena) => {
    let data = constructData(Packet.ARENA, JSON.stringify(arena), DataType.STRING);
    sockets.get(id).send(data);
};

export const sendGameStatus = (id, status: number) => {
    let data = constructData(Packet.GAME_STATUS, status, DataType.NUMBER);
    sockets.get(id).send(data);
};

export const sendAlert = (id, message: string) => {
    let data = constructData(Packet.ALERT, message, DataType.STRING);
    sockets.get(id).send(data);
};

export const sendPlayerAddition = (id, pos: Vector3) => {
    let dataObj = {
        id: id,
        pos: [pos.x, pos.y, pos.z]
    };
    let data = constructData(Packet.PLAYER_ADD, JSON.stringify(dataObj), DataType.STRING);
    sockets.get(id).send(data);
};

export const sendPlayerRemoval = (id) => {
    let dataObj = {
        id: id,
    };
    let data = constructData(Packet.PLAYER_REMOVE, JSON.stringify(dataObj), DataType.STRING);
    sockets.get(id).send(data);
};

export const sendPlayerMove = (id, pos: Vector3, headRot: number, bodyRot: number) => {
    let dataObj = {
        id: id,
        pos: [pos.x, pos.y, pos.z],
        headRot: headRot,
        bodyRot: bodyRot
    };
    let data = constructData(Packet.PLAYER_MOVE, JSON.stringify(dataObj), DataType.STRING);
    sockets.get(id).send(data);
}

export const sendConnectedPlayerAddition = (id, playerData) => {
    let data = constructData(Packet.CONNECTED_PLAYER_ADD, JSON.stringify(playerData), DataType.STRING);

    sockets.get(id).send(data);
};

export const sendConnectedPlayerRemoval = (id, playerId: number) => {
    let dataObj = {
        id: playerId
    };
    let data = constructData(Packet.CONNECTED_PLAYER_REMOVE, JSON.stringify(dataObj), DataType.STRING);
    sockets.get(id).send(data);
}

export const sendConnectedPlayerMove = (id: number, pos: Vector3, bodyRot: number, headRot: number, playerId: number) => {
    let data = constructData(Packet.CONNECTED_PLAYER_MOVE, [pos.x, pos.y, pos.z, bodyRot, headRot], DataType.FLOAT_ARRAY_INT_HEADER, playerId);
    sockets.get(id).send(data);
}

export const sendMatchStatistics = (id: number, statistics: string) => {
    let data = constructData(Packet.MATCH_STATISTICS, statistics, DataType.STRING);
    sockets.get(id).send(data);
}

export const addSocket = (id: number, ws: WebSocket) => {
    sockets.set(id, ws);
};

export const removeSocket = (id) => {
    sockets.delete(id);
};

const constructData = (header: Packet, body: any, dataType: DataType, additionalHeader?: number) => {

    let headerBuffer: Buffer;
    if(dataType === DataType.FLOAT_ARRAY || dataType === DataType.FLOAT_ARRAY_INT_HEADER){
        headerBuffer = Buffer.alloc(4);
    }else{
        headerBuffer = Buffer.alloc(2);
    }
    headerBuffer.writeUInt8(header, 0);
    headerBuffer.writeUInt8(dataType, 1);

    let buffer: Buffer;

    switch(dataType){
        case DataType.NUMBER:
            buffer = Buffer.alloc(1);
            buffer.writeUInt8(body, 0);

            break;
        case DataType.STRING:
            buffer = Buffer.from(body, 'utf8');

            break;
        case DataType.INT_ARRAY:

            buffer = Buffer.alloc(body.length);

            for(let i = 0; i < body.length; i += 1){
                buffer.writeUInt8(body[i], i);
            }

            break;
        case DataType.FLOAT_ARRAY:
        
            buffer = Buffer.alloc(body.length * 4);

            for(let i = 0; i < body.length; i += 4){
                buffer.writeFloatLE(body[i], i);
            }

            break;
        case DataType.FLOAT_ARRAY_INT_HEADER:

            headerBuffer.writeUInt8(additionalHeader, 2);

            buffer = Buffer.alloc(body.length * 4);

            for(let i = 0; i < body.length; i += 1){
                buffer.writeFloatLE(body[i], i * 4);
            }
            break;
    }
    return Buffer.concat([headerBuffer, buffer], headerBuffer.length + buffer.length);
};
