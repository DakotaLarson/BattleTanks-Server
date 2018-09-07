import * as PacketSender from './PacketSender';
import Vector3 from './Vector3';

export default class Player {

    name: string;
    id: number;
    pos: Vector3;
    bodyRot: number;
    headRot: number;

    constructor(name, id){
        this.name = name;
        this.id = id;
        this.pos = new Vector3();
        this.bodyRot = 0;
        this.headRot = 0;
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

    sendAssignedInitialSpawn(loc: Vector3){
        this.pos.x = loc.x;
        this.pos.y = loc.y;
        this.pos.z = loc.z;

        PacketSender.sendAssignedInitialSpawn(this.id, loc);
    }

    handlePositionUpdate(data: Array<number>){
        this.pos.x = data[0];
        this.pos.y = data[1];
        this.pos.z = data[2];
        this.bodyRot = data[3];
        this.headRot = data[4];
    }
};
