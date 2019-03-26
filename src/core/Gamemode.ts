import Audio from "../Audio";
import Player from "../entity/Player";
import PlayerHandler from "../entity/PlayerHandler";
import EventHandler from "../EventHandler";
import Match from "./Match";

export default class Gamemode {

    private static readonly PROJECTILE_DAMAGE = 0.2;
    private static readonly RAM_DAMAGE = 0.4;
    private static readonly LIFE_COUNT = 3;
    private static readonly OOB_ID = -1; // Out of Bounds Id
    private static readonly RESPAWN_TIME = 7500;
    private static readonly PROTECTED_TIME = 3000;

    private match: Match;

    private lives: Map<number, number>;
    private protected: number[];

    private timeouts: NodeJS.Timeout[];
    constructor(match: Match) {
        this.match = match;
        this.lives = new Map();
        this.protected = [];
        this.timeouts = [];
    }
    public enable(): void {
        EventHandler.addListener(this, EventHandler.Event.PLAYER_DAMAGE_PROJECTILE, this.onProjectileHit);
        EventHandler.addListener(this, EventHandler.Event.RAM_COLLISION, this.onRamHit);

        for (const player of PlayerHandler.getMatchPlayers(this.match)) {
            this.lives.set(player.id, Gamemode.LIFE_COUNT);
        }
    }

    public disable(): void {
        EventHandler.removeListener(this, EventHandler.Event.PLAYER_DAMAGE_PROJECTILE, this.onProjectileHit);
        EventHandler.removeListener(this, EventHandler.Event.RAM_COLLISION, this.onRamHit);

        this.lives.clear();
        this.protected = [];

        for (const timeout of this.timeouts) {
            clearTimeout(timeout);
        }
        this.timeouts = [];
    }

    public handleOutOfBounds(player: Player) {
        this.killPlayer(player, player.ramAttackerId || Gamemode.OOB_ID);
    }

    public isPlayerValid(player: Player) {
        const lives = this.lives.get(player.id);
        return lives !== undefined && (player.isAlive || lives > 0);
    }

    protected onDeath(target: Player, player: Player)  {
        this.killPlayer(target, player.id);
    }

    private onProjectileHit(data: any) {
        this.onHit(data, Gamemode.PROJECTILE_DAMAGE);
    }

    private onRamHit(data: any) {
        if (this.match.hasPlayer(data.player) && !this.protected.includes(data.targetId)) {
            // collision between players
            const target = PlayerHandler.getMatchPlayer(this.match, data.targetId);
            const vec = target.position.clone().sub(data.player.position).normalize();
            target.sendRamResponse(vec, data.player.id);

            data.match = this.match;
            data.target = target;
            this.onHit(data, Gamemode.RAM_DAMAGE);
        }
    }

    private onHit(data: any, damage: number) {
        if (data.match === this.match) {
            if (!(this.match as Match).onSameTeam(data.player, data.target)) {
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

    private killPlayer(target: Player, playerId: number) {
        let livesRemaining = this.lives.get(target.id) as number;

        if (!isNaN(livesRemaining)) {
            livesRemaining --;
            target.despawn(playerId, livesRemaining);

            for (const otherPlayer of PlayerHandler.getMatchPlayers(this.match)) {
                if (otherPlayer !== target) {
                    otherPlayer.sendConnectedPlayerRemoval(target.id, playerId, livesRemaining);
                }
            }

            EventHandler.callEvent(EventHandler.Event.STATS_KILL, {
                match: this.match,
                player: target.id,
                shooter: playerId,
            });

            if (livesRemaining !== 0) {
                this.respawn(target, livesRemaining);
            } else {
                this.lives.set(target.id, livesRemaining);
                this.onFinalDeath(target);
            }
        } else {
            throw new Error("Unexpected value in lives map: " + livesRemaining);
        }
    }

    private respawn(player: Player, livesRemaining: number) {
        player.sendAudioRequest(Audio.DEATH_RESPAWN);
        const timeout = setTimeout(() => {
            if (this.match.hasPlayer(player)) {
                this.lives.set(player.id, livesRemaining);

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

                    if (this.timeouts.includes(protectionTimeout)) {
                        this.timeouts.splice(this.timeouts.indexOf(protectionTimeout), 1);
                    }
                }, Gamemode.PROTECTED_TIME);
                this.timeouts.push(protectionTimeout);
            }
            if (this.timeouts.includes(timeout)) {
                this.timeouts.splice(this.timeouts.indexOf(timeout), 1);
            }
        }, Gamemode.RESPAWN_TIME);
        this.timeouts.push(timeout);
    }

    private onFinalDeath(target: Player) {
        // Check if there are valid players on KO'd player's team.
        if (this.match.hasRealPlayers()) {
            for (const player of PlayerHandler.getMatchPlayers(this.match)) {
                if ((this.match as Match).onSameTeam(player, target)) {
                    if (this.isPlayerValid(player)) {
                        target.sendAudioRequest(Audio.DEATH_NORESPAWN);
                        target.sendPlayerSpectating();

                        return;
                    }
                }
            }
        }

        for (const player of PlayerHandler.getMatchPlayers(this.match)) {
            if ((this.match as Match).onSameTeam(player, target)) {
                player.sendAudioRequest(Audio.LOSE);
            } else {
                player.sendAudioRequest(Audio.WIN);
            }
        }
        EventHandler.callEvent(EventHandler.Event.STATS_SEND, {
            match: this.match,
            playerId: target.id,
        });
        const lobby = PlayerHandler.getMatchLobby(this.match);
        lobby.finishMatch(false);
    }
}
