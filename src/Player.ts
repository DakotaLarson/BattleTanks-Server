import Vector3 from ".//vector/Vector3";
import Audio from "./Audio";
import EventHandler from "./EventHandler";
import * as PacketSender from "./PacketSender";
import Vector4 from "./vector/Vector4";

const COOLDOWN_ITERVAL = 1000;

export default class Player {

    public name: string;
    public id: number;

    public pos: Vector3;

    public bodyRot: number;
    public headRot: number;

    public movementVelocity: number;
    public rotationVelocity: number;

    public lastShotTime: number;

    public isAlive: boolean;

    constructor(name: string, id: number) {
        this.name = name;
        this.id = id;

        this.pos = new Vector3();

        this.bodyRot = 0;
        this.headRot = 0;

        this.movementVelocity = 0;
        this.rotationVelocity = 0;

        this.lastShotTime = 0;

        this.isAlive = true;
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

    public sendPlayerAddition(pos: Vector4) {
        this.pos.x = pos.x;
        this.pos.y = pos.y;
        this.pos.z = pos.z;
        this.bodyRot = pos.w;
        this.headRot = 0;

        PacketSender.sendPlayerAddition(this.id, pos);
    }

    public sendPlayerRemoval() {
        PacketSender.sendPlayerRemoval(this.id);
    }

    public sendPlayerMove(pos: Vector4) {
        this.pos.x = pos.x;
        this.pos.y = pos.y;
        this.pos.z = pos.z;
        this.bodyRot = pos.w;

        PacketSender.sendPlayerMove(this.id, pos, this.headRot, this.bodyRot);
    }

    public sendConnectedPlayerAddition(playerId: number, name: string, pos: Vector4, headRot: number) {
        PacketSender.sendConnectedPlayerAddition(this.id, {
            id: playerId,
            name,
            pos: [pos.x, pos.y, pos.z, pos.w],
            headRot,
        });
    }

    public sendConnectedPlayerMove(player: Player) {
        PacketSender.sendConnectedPlayerMove(this.id, player.pos, player.movementVelocity, player.rotationVelocity, player.bodyRot, player.headRot, player.id);
    }

    public sendConnectedPlayerRemoval(playerId: number) {
        PacketSender.sendConnectedPlayerRemoval(this.id, playerId);
    }

    public sendMatchStatistics(stats: any) {
        PacketSender.sendMatchStatistics(this.id, JSON.stringify(stats));
    }

    public sendInvalidShot() {
        PacketSender.sendPlayerShootInvalid(this.id);
    }

    public sendPlayerShoot() {
        PacketSender.sendPlayerShoot(this.id);
    }

    public sendConnectedPlayerShoot(playerId: number) {
        PacketSender.sendConnectedPlayerShoot(this.id, playerId);
    }

    public sendAudioRequest(audio: Audio) {
        PacketSender.sendAudioRequest(this.id, audio);
    }

    public sendCooldownTime(time: number) {
        PacketSender.sendCooldownTime(this.id, time);
    }

    public onMove(data: number[]) {
        this.pos.x = data[0];
        this.pos.y = data[1];
        this.pos.z = data[2];
        this.movementVelocity = data[3];
        this.rotationVelocity = data[4];
        this.bodyRot = data[5];
        this.headRot = data[6];
    }

    public shoot() {
        const currentTime = Date.now();
        if (currentTime - this.lastShotTime > COOLDOWN_ITERVAL) {
            EventHandler.callEvent(EventHandler.Event.PLAYER_SHOOT, this);
            this.lastShotTime = currentTime;
        } else {
            this.sendInvalidShot();
        }
    }
}
