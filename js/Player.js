const EventHandler = require('./EventHandler');
const PacketSender = require('./PacketSender');

module.exports = class Player {

    constructor(name, id){
        this.name = name;
        this.id = id;
    }

    sendArena(arena){
        PacketSender.sendArena(this.id, arena);
    }

    sendGameStatus(status){
        PacketSender.sendGameStatus(this.id, status);
    }
};
