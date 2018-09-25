import * as PacketSender from './PacketSender';
import Vector3 from './Vector3';
import EventHandler from './EventHandler';
import Audio from './Audio';

const COOLDOWN_ITERVAL = 1000;

export default class Player {

    name: string;
    id: number;

    pos: Vector3;
    bodyRot: number;
    headRot: number;

    lastShotTime: number;

    isAlive: boolean;


    constructor(name, id){
        this.name = name;
        this.id = id;

        this.pos = new Vector3();
        this.bodyRot = 0;
        this.headRot = 0;

        this.lastShotTime = 0;

        this.isAlive = true;
    }

    sendArena(arena){
        PacketSender.sendArena(this.id, arena);
    }

    sendGameStatus(status: number){
        PacketSender.sendGameStatus(this.id, status);
    }

    sendAlert(message: string){
        PacketSender.sendAlert(this.id, message);
    }

    sendPlayerAddition(pos: Vector3){
        this.pos.x = pos.x;
        this.pos.y = pos.y;
        this.pos.z = pos.z;
        this.bodyRot = this.headRot = 0;

        PacketSender.sendPlayerAddition(this.id, pos);
    }

    sendPlayerRemoval(){
        PacketSender.sendPlayerRemoval(this.id);
    }

    sendPlayerMove(pos: Vector3){
        this.pos.x = pos.x;
        this.pos.y = pos.y;
        this.pos.z = pos.z;

        PacketSender.sendPlayerMove(this.id, pos, this.headRot, this. bodyRot);
    }

    sendConnectedPlayerAddition(playerId: number, name: string, pos: Vector3, headRot: number, bodyRot: number){
        PacketSender.sendConnectedPlayerAddition(this.id, {
            id: playerId,
            name: name,
            pos: [pos.x, pos.y, pos.z],
            headRot: headRot,
            bodyRot: bodyRot
        });
    }
    
    sendConnectedPlayerMove(pos: Vector3, bodyRot: number, headRot: number, playerId: number){
        PacketSender.sendConnectedPlayerMove(this.id, pos, bodyRot, headRot, playerId);
    }

    sendConnectedPlayerRemoval(playerId: number){
        PacketSender.sendConnectedPlayerRemoval(this.id, playerId);
    }

    sendMatchStatistics(stats){
        PacketSender.sendMatchStatistics(this.id, JSON.stringify(stats));
    }

    sendInvalidShot(){
        PacketSender.sendPlayerShootInvalid(this.id);
    }

    sendPlayerShoot(){
        PacketSender.sendPlayerShoot(this.id);
    }

    sendConnectedPlayerShoot(playerId: number){
        PacketSender.sendConnectedPlayerShoot(this.id, playerId);
    }

    sendAudioRequest(audio: Audio){
        PacketSender.sendAudioRequest(this.id, audio);
    }

    sendCooldownTime(time: number){
        PacketSender.sendCooldownTime(this.id, time);
    }

    handlePositionUpdate(data: Array<number>){
        this.pos.x = data[0];
        this.pos.y = data[1];
        this.pos.z = data[2];
        this.bodyRot = data[3];
        this.headRot = data[4];
    }

    shoot(){
        let currentTime = Date.now();
        if(currentTime - this.lastShotTime > COOLDOWN_ITERVAL){
            EventHandler.callEvent(EventHandler.Event.PLAYER_SHOOT, this);
            this.lastShotTime = currentTime;
        }else{
            this.sendInvalidShot();
        }
    }
}
