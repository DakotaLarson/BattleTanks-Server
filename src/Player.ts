import * as PacketSender from './PacketSender';

export default class Player {

    name: string;
    id: number;

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

    sendAlert(message){
        PacketSender.sendAlert(this.id, message);
    }

    sendAssignedInitialSpawn(loc){
        PacketSender.sendAssignedInitialSpawn(this.id, loc);
    }
};
