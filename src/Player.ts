import {performance} from "perf_hooks";
import Audio from "./Audio";
import EventHandler from "./EventHandler";
import * as PacketSender from "./PacketSender";
import Vector3 from "./vector/Vector3";
import Vector4 from "./vector/Vector4";

export default class Player {

    private static shotCooldown = 75;

    public name: string;
    public id: number;
    public sub: string | undefined;

    public position: Vector3;

    public bodyRot: number;
    public headRot: number;

    public isAlive: boolean;
    public health: number;

    public color: number;

    private movementVelocity: number;
    private rotationVelocity: number;

    private ammoCount: number;
    private reloadPercentage: number;
    private reloading: boolean;

    private moving: boolean;

    private lastShotTime: number;
    private nextShotScheduled: boolean;

    constructor(name: string, id: number, sub?: string) {
        this.name = name;
        this.id = id;
        this.sub = sub;

        this.position = new Vector3();

        this.bodyRot = 0;
        this.headRot = 0;

        this.movementVelocity = 0;
        this.rotationVelocity = 0;

        this.isAlive = false;
        this.health = 1;

        this.ammoCount = 10;
        this.reloadPercentage = 1;
        this.reloading = false;

        this.moving = false;

        this.color = 0x000000;

        this.lastShotTime = performance.now();
        this.nextShotScheduled = false;
    }

    public sendPlayerShoot() {
        PacketSender.sendPlayerShoot(this.id);
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

    public sendConnectedPlayerRemoval(playerId: number, involvedId?: number, livesRemaining?: number) {
        PacketSender.sendConnectedPlayerRemoval(this.id, playerId, involvedId, livesRemaining);
    }

    public sendConnectedPlayerHealth(playerId: number, health: number) {
        PacketSender.sendConnectedPlayerHealth(this.id, playerId, health);
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

    public sendAudioRequest(audio: Audio) {
        PacketSender.sendAudioRequest(this.id, audio);
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
        this.validateShot(() => {
            if (this.isAlive && this.ammoCount > 0) {
                EventHandler.callEvent(EventHandler.Event.PLAYER_SHOOT, this);
                this.ammoCount --;
                if (this.ammoCount === 0) {
                    this.reload();
                }
                PacketSender.sendPlayerAmmoStatus(this.id, this.ammoCount, this.reloadPercentage);
            }
        });
    }

    public resetAmmo() {
        this.reloadPercentage = 1;
        this.ammoCount = 10;
        PacketSender.sendPlayerAmmoStatus(this.id, this.ammoCount, this.reloadPercentage);
    }

    public reload() {
        if (!this.reloading && this.ammoCount < 10) {
            this.ammoCount = 0;
            this.reloadPercentage = 0;

            EventHandler.addListener(this, EventHandler.Event.GAME_TICK, this.onTick);
            this.reloading = true;
        }

    }

    public spawn(pos: Vector4) {
        this.isAlive = true;
        this.health = 1;
        this.ammoCount = 10;

        this.position.x = pos.x;
        this.position.y = pos.y;
        this.position.z = pos.z;
        this.bodyRot = pos.w;
        this.headRot = 0;

        PacketSender.sendPlayerAddition(this.id, pos, this.color);

        PacketSender.sendPlayerHealth(this.id, this.health);
        PacketSender.sendPlayerAmmoStatus(this.id, this.ammoCount, this.reloadPercentage);
    }

    public despawn(involvedId?: number, livesRemaining?: number) {
        this.isAlive = false;
        this.health = 0;
        this.ammoCount = 0;

        PacketSender.sendPlayerRemoval(this.id, involvedId, livesRemaining);
        PacketSender.sendPlayerHealth(this.id, this.health);
    }

    public damage(amount: number) {
        this.health = Math.max(this.health - amount, 0);
        PacketSender.sendPlayerHealth(this.id, this.health);

        return this.health;
    }

    public destroy() {
        if (this.reloading) {
            this.finishReload();
        }
    }

    public onReloadMoveToggle(moving: boolean) {
        this.moving = moving;
    }

    private onTick(delta: number) {
        if (this.reloading) {
            this.updateReload(delta);
        }
    }

    private updateReload(delta: number) {
        let reloadIncrease = delta;
        if (this.moving) {
            reloadIncrease = delta / 3;
        }

        this.reloadPercentage = Math.min(this.reloadPercentage + reloadIncrease, 1);
        if (this.reloadPercentage === 1) {
            this.finishReload();
        }
        PacketSender.sendPlayerAmmoStatus(this.id, this.ammoCount, this.reloadPercentage);
    }

    private finishReload() {
        this.ammoCount = 10;
        EventHandler.removeListener(this, EventHandler.Event.GAME_TICK, this.onTick);
        this.reloading = false;
    }

    private validateShot(callback: () => void) {
        const currentTime = performance.now();
        const timeDiff = currentTime - this.lastShotTime;
        if (timeDiff >= Player.shotCooldown) {
            callback();
            this.lastShotTime = currentTime;
        } else {
            if (!this.nextShotScheduled) {
                const timeRemaining = Player.shotCooldown - timeDiff;
                this.nextShotScheduled = true;
                setTimeout(() => {
                    callback();
                    this.nextShotScheduled = false;
                    this.lastShotTime = performance.now();
                }, timeRemaining);
            }
        }
    }

    // public sendMatchStatistics(stats: any) {
    //     PacketSender.sendMatchStatistics(this.id, JSON.stringify(stats));
    // }
// public sendPlayerMove(pos: Vector4) {
    //     this.position.x = pos.x;
    //     this.position.y = pos.y;
    //     this.position.z = pos.z;
    //     this.bodyRot = pos.w;
    //     PacketSender.sendPlayerMove(this.id, this.position, this.headRot, this.bodyRot);
    // }
    // public sendInvalidShot() {
    //     PacketSender.sendPlayerShootInvalid(this.id);
    // }
    // public sendCooldownTime(time: number) {
    //     PacketSender.sendCooldownTime(this.id, time);
    // }
}
