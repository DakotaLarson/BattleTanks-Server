import Audio from "./Audio";
import Vector3 from "./vector/Vector3";
import Vector4 from "./vector/Vector4";

const sockets: Map<number, WebSocket> = new Map();

enum Packet {
    ARENA,

    GAME_STATUS,

    ALERT,

    PLAYER_ADD,
    PLAYER_MOVE,
    PLAYER_REMOVE,
    PLAYER_SHOOT_INVALID,
    PLAYER_SHOOT,

    CONNECTED_PLAYER_ADD,
    CONNECTED_PLAYER_MOVE,
    CONNECTED_PLAYER_REMOVE,
    CONNECTED_PLAYER_SHOOT,

    MATCH_STATISTICS,

    AUDIO_REQUEST,

    COOLDOWN_TIME,
}

enum DataType {
    NUMBER,
    STRING,
    INT_ARRAY,
    FLOAT_ARRAY,
    FLOAT_ARRAY_INT_HEADER,
    HEADER_ONLY,
}

export const sendArena = (id: number, arena: any) => {
    const data = constructData(Packet.ARENA, JSON.stringify(arena), DataType.STRING);
    send(id, data);
};

export const sendGameStatus = (id: number, status: number) => {
    const data = constructData(Packet.GAME_STATUS, status, DataType.NUMBER);
    send(id, data);
};

export const sendAlert = (id: number, message: string) => {
    const data = constructData(Packet.ALERT, message, DataType.STRING);
    send(id, data);
};

// PLAYER

export const sendPlayerAddition = (id: number, pos: Vector4) => {
    const dataObj = {
        id,
        pos: [pos.x, pos.y, pos.z, pos.w],
    };
    const data = constructData(Packet.PLAYER_ADD, JSON.stringify(dataObj), DataType.STRING);
    send(id, data);
};

export const sendPlayerRemoval = (id: number) => {
    const dataObj = {
        id,
    };
    const data = constructData(Packet.PLAYER_REMOVE, JSON.stringify(dataObj), DataType.STRING);
    send(id, data);
};

export const sendPlayerMove = (id: number, pos: Vector3, headRot: number, bodyRot: number) => {
    const dataObj = {
        id,
        pos: [pos.x, pos.y, pos.z],
        headRot,
        bodyRot,
    };
    const data = constructData(Packet.PLAYER_MOVE, JSON.stringify(dataObj), DataType.STRING);
    send(id, data);
};

export const sendPlayerShootInvalid = (id: number) => {
    const data = constructData(Packet.PLAYER_SHOOT_INVALID, undefined, DataType.HEADER_ONLY);
    send(id, data);
};

export const sendPlayerShoot = (id: number) => {
    const data = constructData(Packet.PLAYER_SHOOT, undefined, DataType.HEADER_ONLY);
    send(id, data);
};

// CONNECTED PLAYER

export const sendConnectedPlayerAddition = (id: number, playerData: any) => {
    const data = constructData(Packet.CONNECTED_PLAYER_ADD, JSON.stringify(playerData), DataType.STRING);

    send(id, data);
};

export const sendConnectedPlayerRemoval = (id: number, playerId: number) => {
    const dataObj = {
        id: playerId,
    };
    const data = constructData(Packet.CONNECTED_PLAYER_REMOVE, JSON.stringify(dataObj), DataType.STRING);
    send(id, data);
};

export const sendConnectedPlayerMove = (id: number, pos: Vector3, movementVelocity: number, rotationVelocity: number, bodyRot: number, headRot: number, playerId: number) => {
    const data = constructData(Packet.CONNECTED_PLAYER_MOVE, [pos.x, pos.y, pos.z, movementVelocity, rotationVelocity, bodyRot, headRot], DataType.FLOAT_ARRAY_INT_HEADER, playerId);
    send(id, data);
};

export const sendConnectedPlayerShoot = (id: number, playerId: number) => {
    const data = constructData(Packet.CONNECTED_PLAYER_SHOOT, playerId, DataType.NUMBER);
    send(id, data);
};

export const sendMatchStatistics = (id: number, statistics: string) => {
    const data = constructData(Packet.MATCH_STATISTICS, statistics, DataType.STRING);
    send(id, data);
};

export const sendAudioRequest = (id: number, audio: Audio) => {
    const data = constructData(Packet.AUDIO_REQUEST, audio,  DataType.NUMBER);
    send(id, data);
};

export const sendCooldownTime = (id: number, time: number) => {
    const data = constructData(Packet.COOLDOWN_TIME, time, DataType.NUMBER);
    send(id, data);
};

export const addSocket = (id: number, ws: WebSocket) => {
    sockets.set(id, ws);
};

export const removeSocket = (id: number) => {
    sockets.delete(id);
};

const send = (id: number, data: any) => {
    const socket: WebSocket | undefined = sockets.get(id);
    if (socket) {
        socket.send(data);
    } else {
        console.warn("Attempting to send data without socket: " + id);
    }
};

const constructData = (header: Packet, body: any, dataType: DataType, additionalHeader?: number) => {

    let headerBuffer: Buffer;
    if (dataType === DataType.FLOAT_ARRAY || dataType === DataType.FLOAT_ARRAY_INT_HEADER) {
        headerBuffer = Buffer.alloc(4);
    } else {
        headerBuffer = Buffer.alloc(2);
    }
    headerBuffer.writeUInt8(header, 0);
    headerBuffer.writeUInt8(dataType, 1);

    let buffer: Buffer;

    switch (dataType) {
        case DataType.NUMBER:
            buffer = Buffer.alloc(1);
            buffer.writeUInt8(body, 0);

            break;
        case DataType.STRING:
            buffer = Buffer.from(body, "utf8");

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

            headerBuffer.writeUInt8((additionalHeader as number), 2);

            buffer = Buffer.alloc(body.length * 4);

            for (let i = 0; i < body.length; i += 1) {
                buffer.writeFloatLE(body[i], i * 4);
            }
            break;
        case DataType.HEADER_ONLY:

            headerBuffer.writeUInt8(header, 0);
            headerBuffer.writeUInt8(dataType, 1);
            return headerBuffer; // No body to concatenate.
        default:
            throw Error("Unknown DataType: " + dataType);
    }
    return Buffer.concat([headerBuffer, buffer], headerBuffer.length + buffer.length);
};
