import Player from "../../entity/Player";
import PlayerHandler from "../../entity/PlayerHandler";
import EventHandler from "../../main/EventHandler";
import Audio from "../Audio";
import Match from "../Match";
import { GamemodeType } from "./GamemodeType";

export default abstract class Gamemode {

    protected static readonly OOB_ID = -1; // Out of Bounds Id

    private static readonly RESPAWN_TIME = 7500;
    private static readonly DEV_RESPAWN_TIME = 7500;
    private static readonly PROTECTED_TIME = 3000;

    private static readonly PROJECTILE_DAMAGE = 0.2;
    private static readonly RAM_DAMAGE = 0.4;

    protected match: Match;

    protected timeouts: NodeJS.Timeout[];

    protected protected: number[];

    private respawnTime: number;

    constructor(match: Match) {
        this.match = match;

        this.timeouts = [];

        this.protected = [];

        this.respawnTime = Gamemode.RESPAWN_TIME;
        if (process.argv.includes("dev")) {
            this.respawnTime = Gamemode.DEV_RESPAWN_TIME;
        }
    }

    public enable() {
        EventHandler.addListener(this, EventHandler.Event.PLAYER_DAMAGE_PROJECTILE, this.onProjectileHit);
        EventHandler.addListener(this, EventHandler.Event.RAM_COLLISION, this.onRamHit);
    }
    public disable() {
        EventHandler.removeListener(this, EventHandler.Event.PLAYER_DAMAGE_PROJECTILE, this.onProjectileHit);
        EventHandler.removeListener(this, EventHandler.Event.RAM_COLLISION, this.onRamHit);

        this.protected = [];
        for (const timeout of this.timeouts) {
            clearTimeout(timeout);
        }
        this.timeouts = [];
    }

    public spawn(player: Player) {
        const spawn = this.match.getSpawn(player);
        player.spawn(spawn);

        this.protected.push(player.id);

        for (const otherPlayer of PlayerHandler.getMatchPlayers(this.match)) {
            if (otherPlayer !== player) {
                otherPlayer.sendConnectedPlayerAddition(player);
                otherPlayer.sendConnectedPlayerHealth(player.id, player.health);
            }
            otherPlayer.sendProtectionStart(player.id);
        }

        const protectionTimeout = setTimeout(() => {
            const index = this.protected.indexOf(player.id);
            if (index > -1) {
                this.protected.splice(index, 1);
            }

            for (const otherPlayer of PlayerHandler.getMatchPlayers(this.match)) {
                otherPlayer.sendProtectionEnd(player.id);
            }

            const timeoutIndex = this.timeouts.indexOf(protectionTimeout);
            if (timeoutIndex > -1) {
                this.timeouts.splice(timeoutIndex, 1);
            }
        }, Gamemode.PROTECTED_TIME);

        this.timeouts.push(protectionTimeout);
    }

    public handleOutOfBounds(player: Player) {
        if (player.isAlive) {
            this.killPlayer(player, player.ramAttackerId || Gamemode.OOB_ID);
        }
    }

    public abstract isPlayerValid(player: Player): boolean;
    public abstract getType(): GamemodeType;

    protected onHit(data: any, damage: number) {
        if (data.match === this.match) {
            if (!this.match.onSameTeam(data.player, data.target)) {
                if (!this.protected.includes(data.target.id)) {
                    const previousShield = data.target.shield;
                    const targetData = data.target.damage(damage);

                    const targetHealth = targetData[0];
                    const targetShield = targetData[1];

                    if (previousShield !== targetShield) {
                        for (const player of PlayerHandler.getMatchPlayers(this.match)) {
                            if (player !== data.target) {
                                player.sendConnectedPlayerShield(data.target.id, targetShield);
                            }
                        }
                    }

                    for (const player of PlayerHandler.getMatchPlayers(this.match)) {
                        if (player !== data.target) {
                            player.sendConnectedPlayerHealth(data.target.id, targetHealth);
                        }
                    }

                    EventHandler.callEvent(EventHandler.Event.STATS_HIT, {
                        match: this.match,
                        player: data.player.id,
                    });

                    if (targetHealth === 0) {
                        this.onDeath(data.target, data.player);
                        data.player.sendAudioRequest(Audio.HIT);
                    } else {
                        data.player.sendAudioRequest(Audio.HIT_HIGH);
                        data.target.sendAudioRequest(Audio.DAMAGE);
                    }
                }
            }
        }
    }

    protected respawn(player: Player) {
        player.sendAudioRequest(Audio.DEATH_RESPAWN);
        const timeout = setTimeout(() => {
            if (this.match.hasPlayer(player)) {

               this.spawn(player);
            }
            const timeoutIndex = this.timeouts.indexOf(timeout);
            if (timeoutIndex > -1) {
                this.timeouts.splice(timeoutIndex, 1);
            }
        }, this.respawnTime);
        this.timeouts.push(timeout);
    }

    protected abstract killPlayer(target: Player, playerId: number): void;

    private onProjectileHit(data: any) {
        this.onHit(data, Gamemode.PROJECTILE_DAMAGE);
    }

    private onRamHit(data: any) {
        if (this.match.hasPlayer(data.player) && !this.protected.includes(data.targetId)) {
            // collision between players
            const target = PlayerHandler.getMatchPlayer(this.match, data.targetId);
            if (!this.match.onSameTeam(data.player, target)) {
                const vec = target.position.clone().sub(data.player.position).normalize();
                target.sendRamResponse(vec, data.player.id);

                data.match = this.match;
                data.target = target;
                this.onHit(data, Gamemode.RAM_DAMAGE);
            }
        }
    }

    private onDeath(target: Player, player: Player)  {
        if (target.isAlive) {
            this.killPlayer(target, player.id);
        }
    }
}
