import Arena from "./Arena";
import EventHandler from "./EventHandler";
import Gamemode from "./gamemode/Gamemode";
import InfiniteGamemode from "./gamemode/InfiniteGamemode";
import MatchStatus from "./MatchStatus";
import Player from "./Player";
import ProjectileHandler from "./projectile/ProjectileHandler";
import Vector4 from "./vector/Vector4";

const PREPARING_TIME = 3000;

export default class Match {

    public arena: Arena;
    public players: Player[];

    private gamemode: Gamemode;
    private matchStatus: MatchStatus;

    private projectileHandler: ProjectileHandler;

    constructor(arena: Arena) {
        this.arena = arena;
        this.gamemode = new InfiniteGamemode(this);

        this.players = [];
        this.matchStatus = MatchStatus.WAITING;

        this.projectileHandler = new ProjectileHandler(this);

        EventHandler.addListener(this, EventHandler.Event.GAME_TICK, this.onTick);
    }

    // public wait() {

    //     this.matchStatus = MatchStatus.WAITING;

    //     for (const player of this.players) {
    //         player.sendGameStatus(this.matchStatus);
    //     }
    // }

    public prepare() {

        // CollisionHandler.updateBlockPositions(arena.blockPositions);

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

        this.gamemode.start();
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

        EventHandler.removeListener(this, EventHandler.Event.GAME_TICK, this.onTick);
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

    public hasPlayer(player: Player) {
        const index = this.players.indexOf(player);
        return index > -1;
    }

    public getPlayerById(id: number): Player {
        for (const player of this.players) {
            if (player.id === id) {
                return player;
            }
        }
        throw new Error("Player does not exist with id: " + id);
    }

    public isFull() {
        return this.players.length >= this.arena.maximumPlayerCount;
    }

    public isFinished() {
        return this.matchStatus === MatchStatus.FINISHED;
    }

    public isRunning() {
        return this.matchStatus === MatchStatus.RUNNING;
    }

    private onTick() {
        for (const player of this.players) {
            for (const otherPlayer of this.players) {
                if (player.id !== otherPlayer.id) {
                    otherPlayer.sendConnectedPlayerMove(player);
                }
            }
        }
    }
}
