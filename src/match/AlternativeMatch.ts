import MatchStatus from "../MatchStatus";
import Player from "../Player";
import Vector4 from "../vector/Vector4";
import Match from "./Match";

const PREPARING_TIME = 3000;

export default class AlternativeMatch extends Match {

    public wait(): void {
        throw new Error("Method not implemented.");
    }

    public prepare() {

        this.matchStatus = MatchStatus.PREPARING;

        for (const player of this.players) {
            player.sendGameStatus(this.matchStatus);
            player.sendAlert("Match starting in 10 seconds!");
        }

        setTimeout(() => {
            if (this.players.length >= this.arena.minimumPlayerCount) {
                this.run();
            } else {
                this.finish();
            }
        }, PREPARING_TIME);
    }

    public run() {

        this.matchStatus = MatchStatus.RUNNING;

        for (const player of this.players) {
            player.isAlive = true;
            player.sendGameStatus(this.matchStatus);
            player.sendAlert("Match started!");
            player.sendCooldownTime(1);
        }

        this.projectileHandler.enable();

        this.gamemode.enable();
    }

    public finish(winner?: Player) {

        this.matchStatus = MatchStatus.FINISHED;

        for (const player of this.players) {
            player.health = 1;
            player.sendGameStatus(this.matchStatus);
            player.sendPlayerRemoval();
            player.sendPlayerHealth(player.health);
            if (winner) {
                player.sendMatchStatistics({
                    winner: winner.name,
                });
            }

            for (const otherPlayer of this.players) {
                if (otherPlayer.id === player.id) { continue; }
                otherPlayer.sendConnectedPlayerHealth(player.id, player.health);
                otherPlayer.sendConnectedPlayerRemoval(player.id);
            }
        }

        this.projectileHandler.disable();

        this.disable();
    }

    public addPlayer(player: Player) {
        player.sendArena(this.arena.getRawData());
        const spawn = this.arena.getNextInitialSpawn();

        player.sendPlayerAddition(spawn);
        for (const otherPlayer of this.players) {
            const otherPlayerPos = new Vector4(otherPlayer.position.x, otherPlayer.position.y, otherPlayer.position.z, otherPlayer.bodyRot);

            otherPlayer.sendConnectedPlayerAddition(player.id, player.name, spawn, player.headRot);
            player.sendConnectedPlayerAddition(otherPlayer.id, otherPlayer.name, otherPlayerPos, otherPlayer.headRot);
        }

        this.players.push(player);

        if (this.players.length >= this.arena.minimumPlayerCount) {
            this.prepare();
        } else {
            player.sendGameStatus(this.matchStatus);
            player.sendAlert("Match starting soon!");

        }
    }

    public removePlayer(player: Player) {

        if (this.matchStatus === MatchStatus.RUNNING) {
            if (this.players.length < this.arena.minimumPlayerCount) {
                this.finish();
            }
        }

        const playerIndex = this.players.indexOf(player);
        if (playerIndex > -1) {
            this.players.splice(playerIndex, 1);
        }

        for (const otherPlayer of this.players) {
            otherPlayer.sendConnectedPlayerRemoval(player.id);
        }
    }
}
