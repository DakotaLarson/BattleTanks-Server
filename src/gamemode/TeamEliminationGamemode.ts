import Audio from "../Audio";
import EventHandler from "../EventHandler";
import TeamEliminationMatch from "../match/TeamEliminationMatch";
import Player from "../Player";
import Gamemode from "./Gamemode";

export default class TeamEliminationGamemode extends Gamemode {

    private static readonly DAMAGE = 0.201;
    private static readonly LIFE_COUNT = 3;

    private lives: Map<number, number>;
    private protected: number[];

    constructor(match: TeamEliminationMatch) {
        super(match);

        this.lives = new Map();
        this.protected = [];
    }

    public enable(): void {
        EventHandler.addListener(this, EventHandler.Event.PLAYER_DAMAGE_HITSCAN, this.onHit);
        EventHandler.addListener(this, EventHandler.Event.PLAYER_DAMAGE_PROJECTILE, this.onHit);

        for (const player of this.match.lobby.players) {
            this.lives.set(player.id, TeamEliminationGamemode.LIFE_COUNT);
        }
    }

    public disable(): void {
        EventHandler.removeListener(this, EventHandler.Event.PLAYER_DAMAGE_HITSCAN, this.onHit);
        EventHandler.removeListener(this, EventHandler.Event.PLAYER_DAMAGE_PROJECTILE, this.onHit);
        this.lives.clear();
        this.protected = [];
    }

    protected onDeath(target: Player, player: Player): void {
        let livesRemaining = this.lives.get(target.id) as number;

        if (!isNaN(livesRemaining)) {
            livesRemaining --;

            target.sendAlert("You were killed by: " + player.name);
            player.sendAlert("You killed: " + target.name);

            target.despawn(player.id, livesRemaining);

            for (const otherPlayer of this.match.lobby.players) {
                if (otherPlayer !== target) {
                    otherPlayer.sendConnectedPlayerRemoval(target.id, player.id, livesRemaining);
                }
            }

            if (livesRemaining !== 0) {
                this.respawn(target, livesRemaining);
                target.sendAlert("Lives remaining: " + livesRemaining);
            } else {
                this.lives.set(target.id, livesRemaining);
                this.onFinalDeath(target);
            }
        } else {
            throw new Error("Unexpected value in lives map: " + livesRemaining);
        }

    }

    private onHit(data: any) {
        if (data.match === this.match) {
            if (!(this.match as TeamEliminationMatch).onSameTeam(data.player, data.target)) {
                const protectedIndex = this.protected.indexOf(data.target.id);
                if (protectedIndex === -1) {
                    const targetHealth = data.target.damage(TeamEliminationGamemode.DAMAGE);

                    for (const player of this.match.lobby.players) {
                        if (player.id !== data.target.id) {
                            player.sendConnectedPlayerHealth(data.target.id, data.target.health);
                        }
                    }

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
                }, 3000);
            }
        }, 3000);
    }

    private onFinalDeath(target: Player) {
        target.sendAlert("KO!");
        for (const player of this.match.lobby.players) {
            if ((this.match as TeamEliminationMatch).onSameTeam(player, target)) {
                if (player.isAlive || this.lives.get(player.id) !== 0) {
                    target.sendAudioRequest(Audio.DEATH_NORESPAWN);
                    return;
                }
            }
        }
        for (const player of this.match.lobby.players) {
            if ((this.match as TeamEliminationMatch).onSameTeam(player, target)) {
                player.sendAlert("Your team lost...");
                player.sendAudioRequest(Audio.LOSE);
            } else {
                player.sendAlert("Your team won!");
                player.sendAudioRequest(Audio.WIN);
            }
        }
        this.match.lobby.finishMatch();
    }
}
