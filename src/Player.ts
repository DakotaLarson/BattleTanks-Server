import Audio from "./Audio";
import EventHandler from "./EventHandler";
import * as PacketSender from "./PacketSender";
import Vector3 from "./vector/Vector3";
import Vector4 from "./vector/Vector4";

export default class Player {

    public name: string;
    public id: number;

    public position: Vector3;

    public bodyRot: number;
    public headRot: number;

    public movementVelocity: number;
    public rotationVelocity: number;

    public lastShotTime: number;

    public isAlive: boolean;
    public health: number;

    public color: number;

    constructor(name: string, id: number) {
        this.name = name;
        this.id = id;

        this.position = new Vector3();

        this.bodyRot = 0;
        this.headRot = 0;

        this.movementVelocity = 0;
        this.rotationVelocity = 0;

        this.lastShotTime = 0;

        this.isAlive = false;
        this.health = 1;

        this.color = 0x000000;
    }

    public sendPlayerAddition(pos: Vector4) {
        this.position.x = pos.x;
        this.position.y = pos.y;
        this.position.z = pos.z;
        this.bodyRot = pos.w;
        this.headRot = 0;

        PacketSender.sendPlayerAddition(this.id, pos, this.color);
    }

    public sendPlayerRemoval() {
        PacketSender.sendPlayerRemoval(this.id);
    }

    public sendPlayerMove(pos: Vector4) {
        this.position.x = pos.x;
        this.position.y = pos.y;
        this.position.z = pos.z;
        this.bodyRot = pos.w;

        PacketSender.sendPlayerMove(this.id, this.position, this.headRot, this.bodyRot);
    }

    public sendPlayerShoot() {
        PacketSender.sendPlayerShoot(this.id);
    }

    public sendPlayerHealth(health: number) {
        PacketSender.sendPlayerHealth(this.id, health);
    }

    public sendPlayerSpectating() {
        PacketSender.sendPlayerSpectating(this.id);
    }

    public sendConnectedPlayerAddition(player: Player) {
        PacketSender.sendConnectedPlayerAddition(this.id, {
            id: player.id,
            name: player.name,
            pos: [player.position.x, player.position.y, player.position.z, player.bodyRot],
            headRot: player.headRot,
            color: player.color,
        });
    }

    public sendConnectedPlayerShoot(playerId: number) {
        PacketSender.sendConnectedPlayerShoot(this.id, playerId);
    }

    public sendConnectedPlayerMove(player: Player) {
        PacketSender.sendConnectedPlayerMove(this.id, player.position, player.movementVelocity, player.rotationVelocity, player.bodyRot, player.headRot, player.id);
    }

    public sendConnectedPlayerRemoval(playerId: number) {
        PacketSender.sendConnectedPlayerRemoval(this.id, playerId);
    }

    public sendConnectedPlayerHealth(playerId: number, health: number) {
        PacketSender.sendConnectedPlayerHealth(this.id, playerId, health);
    }

    public sendMatchStatistics(stats: any) {
        PacketSender.sendMatchStatistics(this.id, JSON.stringify(stats));
    }

    public sendArena(arena: any) {
        PacketSender.sendArena(this.id, arena);
    }

    public sendGameStatus(status: number) {
        PacketSender.sendGameStatus(this.id, status);
    }

    public sendAlert(message: string) {
        PacketSender.sendAlert(this.id, message);
    }

    public sendInvalidShot() {
        PacketSender.sendPlayerShootInvalid(this.id);
    }

    public sendAudioRequest(audio: Audio) {
        PacketSender.sendAudioRequest(this.id, audio);
    }

    public sendCooldownTime(time: number) {
        PacketSender.sendCooldownTime(this.id, time);
    }

    public sendProjectileLaunch(data: number[]) {
        PacketSender.sendProjectileLaunch(this.id, data);
    }

    public sendProjectileMove(data: number[]) {
        PacketSender.sendProjectileMove(this.id, data);
    }

    public sendProjectileRemoval(projId: number) {
        PacketSender.sendProjectileRemoval(this.id, projId);
    }

    public sendProjectileClear() {
        PacketSender.sendProjectileClear(this.id);
    }

    public onMove(data: number[]) {
        this.position.x = data[0];
        this.position.y = data[1];
        this.position.z = data[2];
        this.movementVelocity = data[3];
        this.rotationVelocity = data[4];
        this.bodyRot = data[5];
        this.headRot = data[6];
    }

    public shoot() {
        if (this.isAlive) {
            EventHandler.callEvent(EventHandler.Event.PLAYER_SHOOT, this);
            // const currentTime = Date.now();
            // if (currentTime - this.lastShotTime > COOLDOWN_ITERVAL) {
            //     EventHandler.callEvent(EventHandler.Event.PLAYER_SHOOT, this);
            //     this.lastShotTime = currentTime;
            // } else {
            //     this.sendInvalidShot();
            // }
        }
    }
}
