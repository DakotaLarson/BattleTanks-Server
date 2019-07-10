import {performance} from "perf_hooks";
import Audio from "../Audio";
import EventHandler from "../EventHandler";
import * as PacketSender from "../PacketSender";
import Powerup from "../powerup/Powerup";
import Vector3 from "../vector/Vector3";
import Vector4 from "../vector/Vector4";

export default class Player {

    public static readonly DEFAULT_TANK = "0";
    public static readonly DEFAULT_COLORS = [
        "bfac86",
        "635944",
        "3f5434",
        "283621",
    ];

    public static FULL_AMMO_COUNT = 10;
    public static readonly AMMO_BOOST = 5;

    private static readonly HEAD_OFFSETS_BY_MODEL: Map<string, number> = new Map([
        ["0", 0.0921],
        ["1", 0.3567],
    ]);

    private static readonly HEALTH_BOOST = 0.4;
    private static readonly SPEED_BOOST = 1.4;
    private static readonly SPEED_BOOST_TIME = 7.5;
    private static readonly SHIELD_BOOST = 0.4;

    private static readonly SHOT_COOLDOW = 75;

    private static readonly RAM_COOLDOWN = 7500;
    private static readonly RAM_USAGE_TIME = 500;

    public name: string;
    public id: number;
    public sub: string | undefined;

    public modelId: string;
    public modelColors: string[];

    public position: Vector3;

    public bodyRot: number;
    public headRot: number;

    public isAlive: boolean;
    public health: number;
    public shield: number;

    public hasSpeedBoost: boolean;

    public color: number;

    public ammoCount: number;

    public ramResponse: Vector3 | undefined;
    public ramAttackerId: number | undefined;

    protected movementVelocity: number;
    protected rotationVelocity: number;

    protected timeouts: NodeJS.Timeout[];

    private reloadPercentage: number;
    private reloading: boolean;

    private moving: boolean;

    private lastShotTime: number;
    private nextShotScheduled: boolean;

    private ramTime: number;

    private headOffset: number;

    constructor(name: string, id: number, modelId?: string, modelColors?: string[], sub?: string) {
        this.name = name;
        this.id = id;
        this.sub = sub;

        if (modelId) {
            this.modelId = modelId;
        } else {
            this.modelId = Player.DEFAULT_TANK;
        }

        if (modelColors) {
            this.modelColors = modelColors;
        } else {
            this.modelColors = Player.DEFAULT_COLORS;
        }

        this.headOffset = Player.HEAD_OFFSETS_BY_MODEL.get(this.modelId)!;

        this.position = new Vector3();

        this.bodyRot = 0;
        this.headRot = 0;

        this.movementVelocity = 0;
        this.rotationVelocity = 0;

        this.isAlive = false;
        this.health = 1;
        this.shield = 0;

        this.hasSpeedBoost = false;

        this.ammoCount = Player.FULL_AMMO_COUNT;
        this.reloadPercentage = 1;
        this.reloading = false;

        this.moving = false;

        this.color = 0x000000;

        this.lastShotTime = performance.now();
        this.nextShotScheduled = false;

        this.ramTime = 0;
        this.timeouts = [];
    }

    public sendPlayerName() {
        if (!this.isBot()) {
            PacketSender.sendPlayerName(this.id, this.name);
        }
    }

    public sendPlayerShoot() {
        if (!this.isBot()) {
            PacketSender.sendPlayerShoot(this.id);
        }
    }

    public sendPlayerSpectating() {
        if (!this.isBot()) {
            PacketSender.sendPlayerSpectating(this.id);
        }
    }

    public sendConnectedPlayerJoin(player: Player, sendMessage: boolean) {
        if (!this.isBot()) {
            PacketSender.sendConnectedPlayerJoin(this.id, {
                name: player.name,
                id: player.id,
                sendMessage,
                hasProfile: player.sub !== undefined,
            });
        }
    }

    public sendConnectedPlayerLeave(player: Player, sendMessage: boolean) {
        if (!this.isBot()) {
            PacketSender.sendConnectedPlayerLeave(this.id, {
                name: player.name,
                id: player.id,
                sendMessage,
            });
        }
    }

    public sendConnectedPlayerAddition(player: Player) {
        if (!this.isBot()) {
            PacketSender.sendConnectedPlayerAddition(this.id, {
                id: player.id,
                name: player.name,
                modelId: player.modelId,
                modelColors: player.modelColors,
                pos: [player.position.x, player.position.y, player.position.z, player.bodyRot],
                headRot: player.headRot,
                color: player.color,
                headOffset: player.headOffset,
            });
        }
    }

    public sendConnectedPlayerRemoval(playerId: number, involvedId?: number, livesRemaining?: number) {
        if (!this.isBot()) {
            PacketSender.sendConnectedPlayerRemoval(this.id, playerId, involvedId, livesRemaining);
        }
    }

    public sendConnectedPlayerShoot(playerId: number) {
        if (!this.isBot()) {
            PacketSender.sendConnectedPlayerShoot(this.id, playerId);
        }
    }

    public sendConnectedPlayerMove(player: Player) {
        if (!this.isBot()) {
            PacketSender.sendConnectedPlayerMove(this.id, player.position, player.movementVelocity, player.rotationVelocity, player.bodyRot, player.headRot, player.ramResponse, player.id);
        }
    }

    public sendConnectedPlayerHealth(playerId: number, health: number) {
        if (!this.isBot()) {
            PacketSender.sendConnectedPlayerHealth(this.id, playerId, health);
        }
    }

    public sendConnectedPlayerShield(playerId: number, shield: number) {
        if (!this.isBot()) {
            PacketSender.sendConnectedPlayerShield(this.id, playerId, shield);
        }
    }

    public sendProtectionStart(playerId: number) {
        if (!this.isBot()) {
            PacketSender.sendProtectionStart(this.id, playerId);
        }
    }

    public sendProtectionEnd(playerId: number) {
        if (!this.isBot()) {
            PacketSender.sendProtectionEnd(this.id, playerId);
        }
    }

    public sendArena(arena: any) {
        if (!this.isBot()) {
            PacketSender.sendArena(this.id, arena);
        }
    }

    public sendGameStatus(status: number) {
        if (!this.isBot()) {
            PacketSender.sendGameStatus(this.id, status);
        }
    }

    public sendAlert(message: string) {
        if (!this.isBot()) {
            PacketSender.sendAlert(this.id, message);
        }
    }

    public sendAudioRequest(audio: Audio) {
        if (!this.isBot()) {
            PacketSender.sendAudioRequest(this.id, audio);
        }
    }

    public sendChatMessage(message: string) {
        if (!this.isBot()) {
            PacketSender.sendChatMessage(this.id, message);
        }
    }

    public sendPowerupAddition(powerup: Powerup) {
        if (!this.isBot()) {
            PacketSender.sendPowerupAddition(this.id, [powerup.typeId, powerup.position.x, powerup.position.y, powerup.position.z]);
        }
    }

    public sendPowerupRemoval(powerup: Powerup) {
        if (!this.isBot()) {
            PacketSender.sendPowerupRemoval(this.id, [powerup.typeId, powerup.position.x, powerup.position.y, powerup.position.z]);
        }
    }

    public sendPowerupPickup() {
        if (!this.isBot()) {
            PacketSender.sendPlayerPowerupPickup(this.id);  // Sound.
        }
    }

    public sendProjectileLaunch(data: any) {
        if (!this.isBot()) {
            PacketSender.sendProjectileLaunch(this.id, data);
        }
    }

    public sendProjectileRemoval(id: number) {
        if (!this.isBot()) {
            PacketSender.sendProjectileRemoval(this.id, id);
        }
    }

    public sendProjectileClear() {
        if (!this.isBot()) {
            PacketSender.sendProjectileClear(this.id);
        }
    }

    public sendMatchStatistics(stats: number[]) {
        if (!this.isBot()) {
            PacketSender.sendMatchStatistics(this.id, stats);
        }
    }

    public sendStatisticsUpdate(stats: any) {
        if (!this.isBot()) {
            PacketSender.sendStatisticsUpdate(this.id, stats);
        }
    }

    public sendRamResponse(vec: Vector3, attackerId: number) {
        if (!this.isBot()) {
            PacketSender.sendPlayerRamResponse(this.id, vec);
        }
        this.ramResponse = vec;
        this.ramAttackerId = attackerId;
        setTimeout(() => {
            this.ramResponse = undefined;
            this.ramAttackerId = undefined;
        }, 1000);
    }

    public sendVoteList(votableArenas: any[]) {
        if (!this.isBot()) {
            PacketSender.sendVoteList(this.id, votableArenas);
        }
    }

    public sendVoteUpdate(voteIndex: number, voteCount: number) {
        if (!this.isBot()) {
            PacketSender.sendVoteUpdate(this.id, voteIndex, voteCount);
        }
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
                if (!this.isBot()) {
                    PacketSender.sendPlayerAmmoStatus(this.id, this.ammoCount, this.reloadPercentage);
                }
            }
        });
    }

    public ram() {
        const currentTime = Date.now();
        if (currentTime - this.ramTime > Player.RAM_COOLDOWN) {
            this.ramTime = currentTime;
            if (!this.isBot()) {
                PacketSender.sendPlayerRam(this.id, Player.RAM_USAGE_TIME);
            }
        }
    }

    public resetAmmo() {
        this.reloadPercentage = 1;
        this.ammoCount = 10;
        if (!this.isBot()) {
            PacketSender.sendPlayerAmmoStatus(this.id, this.ammoCount, this.reloadPercentage);
        }
    }

    public reload() {
        if (!this.reloading && this.ammoCount < 10) {
            this.ammoCount = 0;
            this.reloadPercentage = 0;

            EventHandler.addListener(this, EventHandler.Event.GAME_TICK, this.onTick);
            if (!this.isBot()) {
                PacketSender.sendPlayerReloadStart(this.id);
            }
            this.reloading = true;
        }
    }

    public spawn(pos: Vector4) {
        this.isAlive = true;
        this.health = 1;
        this.shield = 0;
        this.ramTime = 0;
        this.ammoCount = 10;

        this.position.x = pos.x;
        this.position.y = pos.y;
        this.position.z = pos.z;

        this.bodyRot = pos.w;
        this.headRot = pos.w;

        if (!this.isBot()) {
            PacketSender.sendPlayerAddition(this.id, pos, this.color, this.modelId, this.modelColors, this.headOffset);

            PacketSender.sendPlayerHealth(this.id, this.health);
            PacketSender.sendPlayerAmmoStatus(this.id, this.ammoCount, this.reloadPercentage);
        }
    }

    public despawn(involvedId?: number, livesRemaining?: number) {
        this.isAlive = false;
        this.health = 0;
        this.shield = 0;
        this.ammoCount = 0;
        this.position = new Vector3();

        this.resetSpeed();

        if (!this.isBot()) {
            PacketSender.sendPlayerRemoval(this.id, involvedId, livesRemaining);
            PacketSender.sendPlayerHealth(this.id, this.health);
        }
    }

    public damage(amount: number) {
        if (amount > this.shield) {
            const diff = amount - this.shield;
            this.alterShield(-amount);
            this.alterHealth(-diff);
        } else {
            this.alterShield(-amount);
        }
        return [this.health, this.shield];
    }

    public destroy() {
        if (this.reloading) {
            this.finishReload(false);
        }
        for (const timeout of this.timeouts) {
            clearTimeout(timeout);
        }
    }

    public onReloadMoveToggle(moving: boolean) {
        this.moving = moving;
    }

    public boostAmmo() {
        if (this.reloading) {
            this.finishReload(true);
            this.reloadPercentage = 1;
        }
        this.ammoCount = Player.FULL_AMMO_COUNT + Player.AMMO_BOOST;
        if (!this.isBot()) {
            PacketSender.sendPlayerAmmoStatus(this.id, this.ammoCount, this.reloadPercentage);
        }
    }

    public boostHealth() {
        this.alterHealth(Player.HEALTH_BOOST);
    }

    public boostSpeed() {
        this.hasSpeedBoost = true;
        if (!this.isBot()) {
            PacketSender.sendPlayerSpeedMultiplier(this.id, Player.SPEED_BOOST);
        }
        const timeout = setTimeout(() => {
            this.resetSpeed();
            this.removeTimeout(timeout);
        }, Player.SPEED_BOOST_TIME * 1000);
        this.timeouts.push(timeout);
        setTimeout(this.resetSpeed.bind(this), Player.SPEED_BOOST_TIME * 1000);
    }

    public boostShield() {
        this.alterShield(Player.SHIELD_BOOST);
    }

    public isBot() {
        return false;
    }

    protected onTick(delta: number) {
        if (this.reloading) {
            this.updateReload(delta);
        }
    }

    private resetSpeed() {
        if (!this.isBot()) {
            PacketSender.sendPlayerSpeedMultiplier(this.id, 1);
        }
        this.hasSpeedBoost = false;
    }

    private alterHealth(amount: number) {
        this.health = Math.round(Math.max(Math.min(this.health + amount, 1), 0) * 100) / 100;
        if (!this.isBot()) {
            PacketSender.sendPlayerHealth(this.id, this.health);
        }
        return this.health;
    }

    private alterShield(amount: number) {
        this.shield = Math.round(Math.max(Math.min(this.shield + amount, 1), 0) * 100) / 100;
        if (!this.isBot()) {
            PacketSender.sendPlayerShield(this.id, this.shield);
        }

        return this.shield;
    }

    private updateReload(delta: number) {
        let reloadIncrease = delta;
        if (this.moving) {
            reloadIncrease = delta / 3;
        }

        this.reloadPercentage = Math.min(this.reloadPercentage + reloadIncrease, 1);
        if (this.reloadPercentage === 1) {
            this.finishReload(true);
        }
        if (!this.isBot()) {
            PacketSender.sendPlayerAmmoStatus(this.id, this.ammoCount, this.reloadPercentage);
        }
    }

    private finishReload(sendData: boolean) {
        this.ammoCount = Player.FULL_AMMO_COUNT;
        EventHandler.removeListener(this, EventHandler.Event.GAME_TICK, this.onTick);
        if (sendData && !this.isBot()) {
            PacketSender.sendPlayerReloadEnd(this.id);
        }
        this.reloading = false;
    }

    private validateShot(callback: () => void) {
        const currentTime = performance.now();
        const timeDiff = currentTime - this.lastShotTime;
        if (timeDiff >= Player.SHOT_COOLDOW) {
            callback();
            this.lastShotTime = currentTime;
        } else {
            if (!this.nextShotScheduled) {
                const timeRemaining = Player.SHOT_COOLDOW - timeDiff;
                this.nextShotScheduled = true;
                const timeout = setTimeout(() => {
                    callback();
                    this.nextShotScheduled = false;
                    this.lastShotTime = performance.now();
                    this.removeTimeout(timeout);
                }, timeRemaining);
                this.timeouts.push(timeout);
            }
        }
    }

    private removeTimeout(timeout: NodeJS.Timeout) {
        const index = this.timeouts.indexOf(timeout);
        if (index > -1) {
            this.timeouts.splice(index, 1);
        }
    }
}
