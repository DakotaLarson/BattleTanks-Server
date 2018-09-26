import Player from "./Player";

const receivePosition = (player: Player, data: number[]) => {
    player.handlePositionUpdate(data);
};

const receivePlayerShoot = (player: Player) => {
    player.shoot();
};

const handlers = new Map([
    [0x01, receivePosition],
    [0X02, receivePlayerShoot],
]);

enum DataType {
    NUMBER = 0X00,
    STRING = 0X01,
    INT_ARRAY = 0x02,
    FLOAT_ARRAY = 0X03,
    HEADER_ONLY = 0X04,
}

export default class PacketReceiver {
    public static handleMessage(message: Buffer, player: Player) {
        const headerArr = Buffer.from(message.slice(0, 2));
        const header = headerArr.readUInt8(0);
        const dataType = headerArr.readUInt8(1);
        let body: any;
        switch (dataType) {
            case DataType.NUMBER:
                body = message.readUInt8(2);
                break;
            case DataType.STRING:
                body = message.toString("utf8", 2);
                break;
            case DataType.INT_ARRAY:
                body = new Array();
                for (let i = 1; i < message.length; i += 1) {
                    body.push(message.readUInt8(i));
                }
                break;
            case DataType.FLOAT_ARRAY:
                body = new Array();
                for (let i = 4; i < message.length; i += 4) {
                    body.push(message.readFloatLE(i));
                }
                break;
            case DataType.HEADER_ONLY:
                body = new Array();
                break;
        }
        const handler = handlers.get(header);
        if (handler) {
            handler(player, body);
        } else {
            console.warn("Received unknown header: " + header);
        }
    }
}
