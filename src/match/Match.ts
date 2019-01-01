import Arena from "../Arena";
import EventHandler from "../EventHandler";
import Gamemode from "../gamemode/Gamemode";
import Lobby from "../lobby/Lobby";
import Player from "../Player";
import PowerupHandler from "../powerup/PowerupHandler";
import ProjectileHandler from "../projectile/ProjectileHandler";
import Vector4 from "../vector/Vector4";

export default abstract class Match {

    public arena: Arena;
    public lobby: Lobby;

    protected powerupHandler: PowerupHandler;

    protected abstract gamemode: Gamemode;

    private projectileHandler: ProjectileHandler;

    constructor(arena: Arena, lobby: Lobby) {
        this.arena = arena;
        this.lobby = lobby;

        this.projectileHandler = new ProjectileHandler(this);
        this.powerupHandler = new PowerupHandler(this);
    }

    public run() {
        EventHandler.addListener(this, EventHandler.Event.PLAYER_MOVE, this.onPlayerMove);
        EventHandler.addListener(this, EventHandler.Event.RAM_COLLISION, this.onRamCollision);

        for (const player of this.lobby.players) {
            player.sendArena(this.arena.getRawData());
        }
        this.projectileHandler.enable();
        this.powerupHandler.enable();
        this.gamemode.enable();
    }

    public finish() {
        EventHandler.removeListener(this, EventHandler.Event.PLAYER_MOVE, this.onPlayerMove);
        EventHandler.removeListener(this, EventHandler.Event.RAM_COLLISION, this.onRamCollision);

        for (const player of this.lobby.players) {
            player.despawn();
            for (const otherPlayer of this.lobby.players) {
                if (player !== otherPlayer) {
                    player.sendConnectedPlayerRemoval(otherPlayer.id);
                }
            }
        }
        this.projectileHandler.disable();
        this.powerupHandler.disable();
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

    protected abstract handlePlayerOutOfBounds(player: Player): void;

    private onPlayerMove(player: Player) {

        if (this.hasPlayer(player)) {
            if (this.isPlayerInBounds(player, this.arena)) {
                for (const otherPlayer of this.lobby.players) {
                    if (player !== otherPlayer) {
                        otherPlayer.sendConnectedPlayerMove(player);
                    }
                }
            } else {
                this.handlePlayerOutOfBounds(player);
            }
        }
    }

    private onRamCollision(data: any) {
        if (this.hasPlayer(data.player)) {
            // collision between players
            console.log("collision");
        }

    }

    private isPlayerInBounds(player: Player, arena: Arena) {
        const xPos = player.position.x + 0.5;
        const zPos = player.position.z + 0.5;

        const width = arena.width + 2;
        const height = arena.height + 2;

        return xPos >= 0 && xPos <= width && zPos >= 0 && zPos <= height;
    }
}
