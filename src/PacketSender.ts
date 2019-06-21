import Audio from "./Audio";
import EventHandler from "./EventHandler";
import Vector3 from "./vector/Vector3";
import Vector4 from "./vector/Vector4";

const sockets: Map<number, WebSocket> = new Map();

enum Packet {
    ARENA,

    GAME_STATUS,

    ALERT,

    PLAYER_NAME,
    PLAYER_ADD,
    PLAYER_REMOVE,
    PLAYER_SHOOT_INVALID,
    PLAYER_SHOOT,
    PLAYER_HEALTH,
    PLAYER_SHIELD,
    PLAYER_SPECTATING,
    PLAYER_AMMO_STATUS,
    PLAYER_SPEED_MULTIPLIER,
    PLAYER_POWERUP_PICKUP,
    PLAYER_RAM,
    PLAYER_RAM_RESPONSE,
    PLAYER_RELOAD_START,
    PLAYER_RELOAD_END,

    CONNECTED_PLAYER_JOIN,
    CONNECTED_PLAYER_LEAVE,
    CONNECTED_PLAYER_ADD,
    CONNECTED_PLAYER_REMOVE,
    CONNECTED_PLAYER_MOVE,
    CONNECTED_PLAYER_SHOOT,
    CONNECTED_PLAYER_HEALTH,
    CONNECTED_PLAYER_SHIELD,

    PROTECTION_START,
    PROTECTION_END,

    MATCH_STATISTICS, // End of Match
    MATCH_STATISTICS_UPDATE, // Live Updates

    AUDIO_REQUEST,

    COOLDOWN_TIME,

    PROJECTILE_LAUNCH,
    PROJECTILE_REMOVAL,
    PROJECTILE_CLEAR,

    CHAT_MESSAGE,

    POWERUP_ADDITION,
    POWERUP_REMOVAL,
    POWERUP_APPLICATION,

    PONG,
}

enum DataType {
    NUMBER,
    STRING,
    NUMBER_ARRAY,
    NUMBER_ARRAY_HEADER,
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

export const sendPlayerName = (id: number, name: string) => {
    const data = constructData(Packet.PLAYER_NAME, name, DataType.STRING);
    send(id, data);
};

export const sendPlayerAddition = (id: number, pos: Vector4, color: number, modelId: string, modelColors: string[]) => {
    const dataObj = {
        id,
        modelId,
        modelColors,
        pos: [pos.x, pos.y, pos.z, pos.w],
        color,
    };
    const data = constructData(Packet.PLAYER_ADD, JSON.stringify(dataObj), DataType.STRING);
    send(id, data);
};

export const sendPlayerRemoval = (id: number, involvedId?: number, livesRemaining?: number) => {
    involvedId = involvedId || 0;
    livesRemaining = livesRemaining || 0;
    const rawData = [id, involvedId, livesRemaining];
    const data = constructData(Packet.PLAYER_REMOVE, rawData, DataType.NUMBER_ARRAY);
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

export const sendPlayerHealth = (id: number, health: number) => {
    const data = constructData(Packet.PLAYER_HEALTH, health, DataType.NUMBER);
    send(id, data);
};

export const sendPlayerShield = (id: number, shield: number) => {
    const data = constructData(Packet.PLAYER_SHIELD, shield, DataType.NUMBER);
    send(id, data);
};

export const sendPlayerSpectating = (id: number) => {
    const data = constructData(Packet.PLAYER_SPECTATING, undefined, DataType.HEADER_ONLY);
    send(id, data);
};

export const sendPlayerAmmoStatus = (id: number, ammoCount: number, reloadPercentage: number) => {
    const data = constructData(Packet.PLAYER_AMMO_STATUS, [ammoCount, reloadPercentage], DataType.NUMBER_ARRAY);
    send(id, data);
};

export const sendPlayerSpeedMultiplier = (id: number, multiplier: number) => {
    const data = constructData(Packet.PLAYER_SPEED_MULTIPLIER, multiplier, DataType.NUMBER);
    send(id, data);
};

export const sendPlayerPowerupPickup = (id: number) => {
    const data = constructData(Packet.PLAYER_POWERUP_PICKUP, undefined, DataType.HEADER_ONLY);
    send(id, data);
};

export const sendPlayerRam = (id: number, time: number) => {
    const data = constructData(Packet.PLAYER_RAM, time, DataType.NUMBER);
    send(id, data);
};

export const sendPlayerRamResponse = (id: number, vec: Vector3) => {
    const data = constructData(Packet.PLAYER_RAM_RESPONSE, [vec.x, vec.y, vec.z], DataType.NUMBER_ARRAY);
    send(id, data);
};

export const sendPlayerReloadStart = (id: number) => {
    const data = constructData(Packet.PLAYER_RELOAD_START, undefined, DataType.HEADER_ONLY);
    send(id, data);
};

export const sendPlayerReloadEnd = (id: number) => {
    const data = constructData(Packet.PLAYER_RELOAD_END, undefined, DataType.HEADER_ONLY);
    send(id, data);
};

// CONNECTED PLAYER

export const sendConnectedPlayerJoin = (id: number, playerData: any) => {
    const data = constructData(Packet.CONNECTED_PLAYER_JOIN, JSON.stringify(playerData), DataType.STRING);
    send(id, data);
};

export const sendConnectedPlayerLeave = (id: number, playerData: any) => {
    const data = constructData(Packet.CONNECTED_PLAYER_LEAVE, JSON.stringify(playerData), DataType.STRING);
    send(id, data);
};

export const sendConnectedPlayerAddition = (id: number, playerData: any) => {
    const data = constructData(Packet.CONNECTED_PLAYER_ADD, JSON.stringify(playerData), DataType.STRING);
    send(id, data);
};

export const sendConnectedPlayerRemoval = (id: number, playerId: number, involvedId?: number, livesRemaining?: number) => {
    involvedId = involvedId || 0;
    livesRemaining = livesRemaining || 0;
    const rawData = [playerId, involvedId, livesRemaining];
    const data = constructData(Packet.CONNECTED_PLAYER_REMOVE, rawData, DataType.NUMBER_ARRAY);
    send(id, data);
};

export const sendConnectedPlayerMove = (id: number, pos: Vector3, movementVelocity: number, rotationVelocity: number, bodyRot: number, headRot: number, ramResponse: Vector3 | undefined, playerId: number) => {
    const rawData = [pos.x, pos.y, pos.z, movementVelocity, rotationVelocity, bodyRot, headRot];
    if (ramResponse) {
        rawData.push(ramResponse.x, ramResponse.y, ramResponse.z);
    }
    const data = constructData(Packet.CONNECTED_PLAYER_MOVE, rawData, DataType.NUMBER_ARRAY_HEADER, playerId);
    send(id, data);
};

export const sendConnectedPlayerShoot = (id: number, playerId: number) => {
    const data = constructData(Packet.CONNECTED_PLAYER_SHOOT, playerId, DataType.NUMBER);
    send(id, data);
};

export const sendConnectedPlayerHealth = (id: number, playerId: number, health: number) => {
    const data = constructData(Packet.CONNECTED_PLAYER_HEALTH, [health], DataType.NUMBER_ARRAY_HEADER, playerId);
    send(id, data);
};

export const sendConnectedPlayerShield = (id: number, playerId: number, shield: number) => {
    const data = constructData(Packet.CONNECTED_PLAYER_SHIELD, [shield], DataType.NUMBER_ARRAY_HEADER, playerId);
    send(id, data);
};

export const sendProtectionStart = (id: number, playerId: number) => {
    const data = constructData(Packet.PROTECTION_START, playerId, DataType.NUMBER);
    send(id, data);
};

export const sendProtectionEnd = (id: number, playerId: number) => {
    const data = constructData(Packet.PROTECTION_END, playerId, DataType.NUMBER);
    send(id, data);
};

export const sendMatchStatistics = (id: number, statistics: number[]) => {
    const data = constructData(Packet.MATCH_STATISTICS, statistics, DataType.NUMBER_ARRAY);
    send(id, data);
};

export const sendStatisticsUpdate = (id: number, statistics: any) => {
    const computedData = [];
    if (statistics.points) {
        computedData.push(0, statistics.points);
    }
    if (statistics.kills) {
        computedData.push(1, statistics.kills);
    }
    if (statistics.deaths) {
        computedData.push(2, statistics.deaths);
    }
    const data = constructData(Packet.MATCH_STATISTICS_UPDATE, computedData, DataType.NUMBER_ARRAY_HEADER, statistics.id);
    send(id, data);
};

export const sendAudioRequest = (id: number, audio: Audio) => {
    const data = constructData(Packet.AUDIO_REQUEST, audio,  DataType.STRING);
    send(id, data);
};

export const sendCooldownTime = (id: number, time: number) => {
    const data = constructData(Packet.COOLDOWN_TIME, time, DataType.NUMBER);
    send(id, data);
};

export const sendProjectileLaunch = (id: number, packetData: number[]) => {
    const data = constructData(Packet.PROJECTILE_LAUNCH, packetData, DataType.NUMBER_ARRAY);
    send(id, data);
};

export const sendProjectileRemoval = (id: number, projId: number) => {
    const data = constructData(Packet.PROJECTILE_REMOVAL, projId, DataType.NUMBER);
    send(id, data);
};

export const sendProjectileClear = (id: number) => {
    const data = constructData(Packet.PROJECTILE_CLEAR, undefined, DataType.HEADER_ONLY);
    send(id, data);
};

export const sendChatMessage = (id: number, constructedMessage: string) => {
    const data = constructData(Packet.CHAT_MESSAGE, constructedMessage, DataType.STRING);
    send(id, data);
};

export const sendPowerupAddition = (id: number, packetData: number[]) => {
    const data = constructData(Packet.POWERUP_ADDITION, packetData, DataType.NUMBER_ARRAY);
    send(id, data);
};

export const sendPowerupRemoval = (id: number, packetData: number[]) => {
    const data = constructData(Packet.POWERUP_REMOVAL, packetData, DataType.NUMBER_ARRAY);
    send(id, data);
};

export const sendPowerupApplication = (id: number, powerupId: number) => {
    const data = constructData(Packet.POWERUP_APPLICATION, powerupId, DataType.NUMBER);
    send(id, data);
};

export const sendPong = (id: number) => {
    const data = constructData(Packet.PONG, undefined, DataType.HEADER_ONLY);
    send(id, data);
};

export const addSocket = (id: number, ws: WebSocket) => {
    sockets.set(id, ws);
};

export const removeSocket = (id: number) => {
    sockets.delete(id);
};

const send = (id: number, data: Buffer) => {
    const socket: WebSocket | undefined = sockets.get(id);
    if (socket) {
        if (socket.readyState !== socket.OPEN) {
            console.warn("socket is closed, but not removed.");
        } else {
            socket.send(data);
            EventHandler.callEvent(EventHandler.Event.DATA_OUTBOUND, Buffer.byteLength(data));
        }
    } else {
        console.warn("Attempting to send data without socket: " + id);
    }
};

const constructData = (header: Packet, body: any, dataType: DataType, additionalHeader?: number) => {

    let headerBuffer: Buffer;
    if (dataType === DataType.NUMBER_ARRAY || dataType === DataType.NUMBER_ARRAY_HEADER || dataType === DataType.NUMBER) {
        headerBuffer = Buffer.alloc(4);
    } else {
        headerBuffer = Buffer.alloc(2);
    }
    headerBuffer.writeUInt8(header, 0);
    headerBuffer.writeUInt8(dataType, 1);

    let buffer: Buffer;

    switch (dataType) {
        case DataType.NUMBER:
            buffer = Buffer.alloc(4);
            buffer.writeFloatLE(body, 0);

            break;
        case DataType.STRING:
            buffer = Buffer.from(body, "utf8");

            break;
        case DataType.NUMBER_ARRAY:

            buffer = Buffer.alloc(body.length * 4);

            for (let i = 0; i < body.length; i += 1) {
                buffer.writeFloatLE(body[i], i * 4);
            }

            break;
        case DataType.NUMBER_ARRAY_HEADER:

            headerBuffer.writeUInt16LE((additionalHeader as number), 2);

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
