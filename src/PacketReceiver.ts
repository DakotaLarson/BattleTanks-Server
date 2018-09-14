import Player from './Player';
import EventHandler from './EventHandler';

const receivePosition = (player: Player, data: Array<number>) => {
    player.handlePositionUpdate(data);
}

const receivePlayerShoot = (player: Player) => {
    player.shoot();
}

const handlers = new Map([
    [0x01, receivePosition],
    [0X02, receivePlayerShoot]
]);

enum DataType{
    NUMBER = 0X00,
    STRING = 0X01,
    INT_ARRAY = 0x02,
    FLOAT_ARRAY = 0X03,
    HEADER_ONLY = 0X04
}

export default class PacketReceiver{
    static handleMessage(message: Buffer, player: Player){
        let headerArr = Buffer.from(message.slice(0, 2));
        let header = headerArr.readUInt8(0);
        let dataType = headerArr.readUInt8(1);
        let body;
        switch(dataType){
            case DataType.NUMBER:
                body = message.readUInt8(2);
                break;
            case DataType.STRING:
                body = message.toString('utf8', 2);
                break;
            case DataType.INT_ARRAY:
                body = new Array();
                for(let i = 1; i < message.length; i += 1){
                    body.push(message.readUInt8(i));
                }
                break;
            case DataType.FLOAT_ARRAY:
                body = new Array();
                for(let i = 4; i < message.length; i += 4){
                    body.push(message.readFloatLE(i));
                }
                break;
            case DataType.HEADER_ONLY:
                body = new Array();
                break;
        }
        let handler = handlers.get(header);
        if(handler){
            handler(player, body);
        }else{
            console.warn('Received unknown header: ' + header);
        }
    }
}