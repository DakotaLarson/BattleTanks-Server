import Audio from "../Audio";
import EventHandler from "../EventHandler";
import Player from "../Player";
import Match from "./Match";

export default class Gamemode {

    private static readonly DAMAGE = 0.20;
    private static readonly LIFE_COUNT = 3;
    private static readonly OOB_ID = -2; // Out of Bounds Id
    private static readonly RESPAWN_TIME = 5000;
    private static readonly PROTECTED_TIME = 3000;

    private match: Match;

    private lives: Map<number, number>;
    private protected: number[];
    constructor(match: Match) {
        this.match = match;
        this.lives = new Map();
        this.protected = [];
    }
    public enable(): void {
        EventHandler.addListener(this, EventHandler.Event.PLAYER_DAMAGE_HITSCAN, this.onHit);
        EventHandler.addListener(this, EventHandler.Event.PLAYER_DAMAGE_PROJECTILE, this.onHit);

        for (const player of this.match.lobby.players) {
            this.lives.set(player.id, Gamemode.LIFE_COUNT);
        }
    }

    public disable(): void {
        EventHandler.removeListener(this, EventHandler.Event.PLAYER_DAMAGE_HITSCAN, this.onHit);
        EventHandler.removeListener(this, EventHandler.Event.PLAYER_DAMAGE_PROJECTILE, this.onHit);
        this.lives.clear();
        this.protected = [];
    }

    public handleOutOfBounds(player: Player) {
        this.killPlayer(player, Gamemode.OOB_ID);
    }

    public isPlayerValid(player: Player) {
        return player.isAlive || this.lives.get(player.id) !== 0;
    }

    protected onDeath(target: Player, player: Player): void {
        this.killPlayer(target, player.id);
    }

    private onHit(data: any) {
        if (data.match === this.match) {
            if (!(this.match as Match).onSameTeam(data.player, data.target)) {
                const protectedIndex = this.protected.indexOf(data.target.id);
                if (protectedIndex === -1) {
                    const previousShield = data.target.shield;
                    const targetData = data.target.damage(Gamemode.DAMAGE);

                    const targetHealth = targetData[0];
                    const targetShield = targetData[1];

                    if (previousShield !== targetShield) {
                        for (const player of this.match.lobby.players) {
                            if (player !== data.target) {
                                player.sendConnectedPlayerShield(data.target.id, targetShield);
                            }
                        }
                    }

                    for (const player of this.match.lobby.players) {
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

            for (const otherPlayer of this.match.lobby.players) {
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
        setTimeout(() => {
            if (this.match.hasPlayer(player)) {
                this.lives.set(player.id, livesRemaining);

                const spawn = this.match.getSpawn(player);
                player.spawn(spawn);

                this.protected.push(player.id);

                for (const otherPlayer of this.match.lobby.players) {
                    if (otherPlayer !== player) {
                        otherPlayer.sendConnectedPlayerAddition(player);
                        otherPlayer.sendConnectedPlayerHealth(player.id, player.health);
                    }
                }

                setTimeout(() => {
                    const index = this.protected.indexOf(player.id);
                    if (index > -1) {
                        this.protected.splice(index, 1);
                    }
                }, Gamemode.PROTECTED_TIME);
            }
        }, Gamemode.RESPAWN_TIME);
    }

    private onFinalDeath(target: Player) {
        // Check if there are valid players on KO'd player's team.
        for (const player of this.match.lobby.players) {
            if ((this.match as Match).onSameTeam(player, target)) {
                if (this.isPlayerValid(player)) {
                    if (this.match.hasOnlyBotsRemaining()) {
                        EventHandler.callEvent(EventHandler.Event.LOBBY_ONLY_BOTS_REMAINING, this.match.lobby);
                    } else {
                        target.sendAudioRequest(Audio.DEATH_NORESPAWN);
                    }
                    return;
                }
            }
        }
        for (const player of this.match.lobby.players) {
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
        this.match.lobby.finishMatch();
    }
}
