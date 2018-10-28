import Arena from "../Arena";
import EventHandler from "../EventHandler";
import Gamemode from "../gamemode/Gamemode";
import InfiniteGamemode from "../gamemode/InfiniteGamemode";
import MatchStatus from "../MatchStatus";
import Player from "../Player";
import ProjectileHandler from "../projectile/ProjectileHandler";

export default abstract class Match {

    public arena: Arena;
    public players: Player[];

    protected gamemode: Gamemode;
    protected matchStatus: MatchStatus;

    protected projectileHandler: ProjectileHandler;

    constructor(arena: Arena) {
        this.arena = arena;
        this.gamemode = new InfiniteGamemode(this);

        this.players = [];
        this.matchStatus = MatchStatus.WAITING;

        this.projectileHandler = new ProjectileHandler(this);
    }

    public enable() {
        EventHandler.addListener(this, EventHandler.Event.GAME_TICK, this.onTick);
    }

    public disable() {
        EventHandler.removeListener(this, EventHandler.Event.GAME_TICK, this.onTick);
    }

    public abstract wait(): void;

    public abstract prepare(): void;

    public abstract run(): void;

    public abstract finish(winner?: Player): void;

    public abstract addPlayer(player: Player): void;

    public abstract removePlayer(player: Player): void;

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

    public isEmpty() {
        return this.players.length === 0;
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
