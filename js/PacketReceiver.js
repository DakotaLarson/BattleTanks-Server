import Component from 'Component';
import EventHandler from 'EventHandler';

const Packet = {
    PLAYER_CONNECT: 0x00
}; //CURRENT: 0x00

export default class PacketSender extends Component{

    constructor(){
        super();
    }

    enable = () => {

    };

    disable = () => {

    };

    static get Packet(){
        return Packet;
    }
}
