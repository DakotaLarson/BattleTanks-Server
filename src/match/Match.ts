import Arena from "../Arena";
import EventHandler from "../EventHandler";
import Gamemode from "../gamemode/Gamemode";
import Lobby from "../lobby/Lobby";
import Player from "../Player";
import ProjectileHandler from "../projectile/ProjectileHandler";

export default abstract class Match {

    public arena: Arena;

    protected lobby: Lobby;

    protected abstract gamemode: Gamemode;

    protected projectileHandler: ProjectileHandler;

    constructor(arena: Arena, lobby: Lobby) {
        this.arena = arena;
        this.lobby = lobby;

        this.projectileHandler = new ProjectileHandler(this);
        EventHandler.addListener(this, EventHandler.Event.GAME_TICK, this.onTick);
    }

    public finish() {
        EventHandler.removeListener(this, EventHandler.Event.GAME_TICK, this.onTick);
        this.projectileHandler.disable();

        this.lobby.finishMatch();
    }

    public abstract run(): void;

    public abstract addPlayer(player: Player): void;

    public abstract removePlayer(player: Player): void;

    private onTick() {
        for (const player of this.lobby.players) {
            for (const otherPlayer of this.lobby.players) {
                if (player.id !== otherPlayer.id) {
                    otherPlayer.sendConnectedPlayerMove(player);
                }
            }
        }
    }
}
