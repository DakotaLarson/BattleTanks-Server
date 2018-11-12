import Audio from "../Audio";
import EventHandler from "../EventHandler";
import Match from "../match/Match";
import TeamEliminationMatch from "../match/TeamEliminationMatch";
import Player from "../Player";
import Gamemode from "./Gamemode";

export default class TeamEliminationGamemode extends Gamemode {

    private static readonly DAMAGE = 0.201;
    private static readonly LIFE_COUNT = 3;

    public lives: Map<number, number>;

    constructor(match: Match) {
        super(match);

        this.lives = new Map();
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
    }

    protected onDeath(target: Player, player: Player): void {
        target.sendAlert("You were killed by: " + player.name);
        player.sendAlert("You killed: " + target.name);

        target.sendAudioRequest(Audio.LOSE);

        target.despawn();

        for (const otherPlayer of this.match.lobby.players) {
            if (otherPlayer !== target) {
                otherPlayer.sendConnectedPlayerRemoval(target.id);
            }
        }

        let livesRemaining = this.lives.get(target.id) as number;

        if (!isNaN(livesRemaining)) {
            livesRemaining --;
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

                const targetHealth = data.target.damage(TeamEliminationGamemode.DAMAGE);

                for (const player of this.match.lobby.players) {
                    if (player.id !== data.target.id) {
                        player.sendConnectedPlayerHealth(data.target.id, data.target.health);
                    }
                }

                if (targetHealth === 0) {
                    this.onDeath(data.target, data.player);
                }
            }
        }
    }

    private respawn(player: Player, livesRemaining: number) {
        setTimeout(() => {
            this.lives.set(player.id, livesRemaining);
            const spawn = this.match.getSpawn(player);
            player.spawn(spawn);

            for (const otherPlayer of this.match.lobby.players) {
                if (otherPlayer !== player) {
                    otherPlayer.sendConnectedPlayerAddition(player);
                    otherPlayer.sendConnectedPlayerHealth(player.id, player.health);
                }
            }
        }, 3000);
    }

    private onFinalDeath(target: Player) {
        target.sendAlert("KO!");
        for (const player of this.match.lobby.players) {
            if ((this.match as TeamEliminationMatch).onSameTeam(player, target)) {
                if (player.isAlive || this.lives.get(player.id) !== 0) {
                    return;
                }
            }
        }
        this.match.lobby.finishMatch();
    }
}
