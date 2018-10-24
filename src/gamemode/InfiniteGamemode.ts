import Audio from "../Audio";
import EventHandler from "../EventHandler";
import Match from "../Match";
import Player from "../Player";
import Gamemode from "./Gamemode";

export default class InfiniteGamemode extends Gamemode {

    private static DAMAGE = 0.25;

    constructor(match: Match) {
        super(match);
    }

    public start(): void {

        for (const player of this.match.players) {
            const gameSpawn = this.match.arena.getNextGameSpawn();
            player.sendPlayerMove(gameSpawn);
        }

        EventHandler.addListener(this, EventHandler.Event.PLAYER_DAMAGE_HITSCAN, this.onHit);
        EventHandler.addListener(this, EventHandler.Event.PLAYER_DAMAGE_PROJECTILE, this.onHit);
    }

    protected onDeath(target: Player, player: Player): void {

        target.sendAlert("You were killed by: " + player.name);
        player.sendAlert("You killed: " + target.name);

        target.sendAudioRequest(Audio.LOSE);

        target.isAlive = false;
        const targetId = target.id;
        for (const otherPlayer of this.match.players) {
            if (otherPlayer.id === targetId) {
                otherPlayer.sendPlayerRemoval();
            } else {
                otherPlayer.sendConnectedPlayerRemoval(targetId);
            }
        }

        this.respawn(target);
    }

    private onHit(data: any) {
        if (data.match === this.match) {
            let targetHealth = data.target.health;
            targetHealth = Math.max(targetHealth - InfiniteGamemode.DAMAGE, 0);
            data.target.health = targetHealth;

            for (const player of this.match.players) {
                if (player.id !== data.target.id) {
                    player.sendConnectedPlayerHealth(data.target.id, data.target.health);
                } else {
                    player.sendPlayerHealth(data.target.health);
                }
            }

            if (targetHealth === 0) {
                this.onDeath(data.target, data.player);
                EventHandler.callEvent(EventHandler.Event.PLAYER_DEATH, data);
            }
        }
    }

    private respawn(player: Player) {
        setTimeout(() => {
            const spawn = this.match.arena.getNextGameSpawn();
            player.isAlive = true;
            player.health = 1;
            for (const otherPlayer of this.match.players) {
                if (otherPlayer === player) {
                    player.sendPlayerAddition(spawn);
                    player.sendPlayerHealth(player.health);
                } else {
                    otherPlayer.sendConnectedPlayerAddition(player.id, player.name, spawn, player.headRot);
                    player.sendConnectedPlayerHealth(player.id, player.health);
                }
            }
        }, 3000);
    }
}
