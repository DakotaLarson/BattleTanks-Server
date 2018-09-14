"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const receivePosition = (player, data) => {
    player.handlePositionUpdate(data);
};
const receivePlayerShoot = (player) => {
    player.shoot();
};
const handlers = new Map([
    [0x01, receivePosition],
    [0X02, receivePlayerShoot]
]);
var DataType;
(function (DataType) {
    DataType[DataType["NUMBER"] = 0] = "NUMBER";
    DataType[DataType["STRING"] = 1] = "STRING";
    DataType[DataType["INT_ARRAY"] = 2] = "INT_ARRAY";
    DataType[DataType["FLOAT_ARRAY"] = 3] = "FLOAT_ARRAY";
    DataType[DataType["HEADER_ONLY"] = 4] = "HEADER_ONLY";
})(DataType || (DataType = {}));
class PacketReceiver {
    static handleMessage(message, player) {
        let headerArr = Buffer.from(message.slice(0, 2));
        let header = headerArr.readUInt8(0);
        let dataType = headerArr.readUInt8(1);
        let body;
        switch (dataType) {
            case DataType.NUMBER:
                body = message.readUInt8(2);
                break;
            case DataType.STRING:
                body = message.toString('utf8', 2);
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
        let handler = handlers.get(header);
        if (handler) {
            handler(player, body);
        }
        else {
            console.warn('Received unknown header: ' + header);
        }
    }
}
exports.default = PacketReceiver;
//# sourceMappingURL=PacketReceiver.js.map