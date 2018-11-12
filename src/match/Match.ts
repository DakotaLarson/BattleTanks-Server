import Arena from "../Arena";
import EventHandler from "../EventHandler";
import Gamemode from "../gamemode/Gamemode";
import Lobby from "../lobby/Lobby";
import Player from "../Player";
import ProjectileHandler from "../projectile/ProjectileHandler";
import Vector4 from "../vector/Vector4";

export default abstract class Match {

    public arena: Arena;
    public lobby: Lobby;

    protected abstract gamemode: Gamemode;

    protected projectileHandler: ProjectileHandler;

    constructor(arena: Arena, lobby: Lobby) {
        this.arena = arena;
        this.lobby = lobby;

        this.projectileHandler = new ProjectileHandler(this);
    }

    public run() {
        EventHandler.addListener(this, EventHandler.Event.GAME_TICK, this.onTick);
        for (const player of this.lobby.players) {
            player.sendArena(this.arena.getRawData());
            player.sendAlert("Match started!");
        }
        this.projectileHandler.enable();
        this.gamemode.enable();
    }

    public finish() {
        EventHandler.removeListener(this, EventHandler.Event.GAME_TICK, this.onTick);

        for (const player of this.lobby.players) {
            player.despawn();
            for (const otherPlayer of this.lobby.players) {
                if (player !== otherPlayer) {
                    player.sendConnectedPlayerRemoval(otherPlayer.id);
                }
            }
        }
        this.projectileHandler.disable();
        this.gamemode.disable();
    }

    public hasPlayer(player: Player) {
        for (const otherPlayer of this.lobby.players) {
            if (otherPlayer === player) {
                return true;
            }
        }
        return false;
    }

    public getPlayerById(playerId: number): Player {
        for (const player of this.lobby.players) {
            if (player.id === playerId) {
                return player;
            }
        }
        throw new Error("Player not found with id: " + playerId);
    }

    public abstract addPlayer(player: Player): void;

    public abstract removePlayer(player: Player): void;

    public abstract getSpawn(player: Player): Vector4;

    public abstract getActivePlayerCount(): number;

    public abstract hasEnoughPlayers(): boolean;

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
