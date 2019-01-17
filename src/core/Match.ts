import Arena from "../Arena";
import EventHandler from "../EventHandler";
import Player from "../Player";
import PowerupHandler from "../powerup/PowerupHandler";
import ProjectileHandler from "../projectile/ProjectileHandler";
import MatchStatistics from "../statistics/MatchStatistics";
import Vector4 from "../vector/Vector4";
import Gamemode from "./Gamemode";
import Lobby from "./Lobby";

export default class Match {

    private static readonly TEAM_A_COLOR = 0xf00e30;
    private static readonly TEAM_B_COLOR = 0x0e52f0;

    public arena: Arena;
    public lobby: Lobby;

    private powerupHandler: PowerupHandler;

    private gamemode: Gamemode;

    private teamAPlayers: number[];
    private teamBPlayers: number[];

    private matchStats: MatchStatistics | undefined;

    private projectileHandler: ProjectileHandler;

    constructor(arena: Arena, lobby: Lobby) {
        this.arena = arena;
        this.lobby = lobby;

        this.projectileHandler = new ProjectileHandler(this);
        this.powerupHandler = new PowerupHandler(this);

        this.gamemode = new Gamemode(this);

        this.teamAPlayers = [];
        this.teamBPlayers = [];
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

        for (const player of this.lobby.players) {
            let spawn: Vector4;

            if (this.teamAPlayers.length < this.teamBPlayers.length) {
                this.teamAPlayers.push(player.id);
                player.color = Match.TEAM_A_COLOR;
                spawn = this.arena.getNextTeamASpawn();
            } else if (this.teamBPlayers.length < this.teamAPlayers.length) {
                this.teamBPlayers.push(player.id);
                player.color = Match.TEAM_B_COLOR;
                spawn = this.arena.getNextTeamBSpawn();
            } else {
                if (Math.random() >= 0.5) {
                    this.teamAPlayers.push(player.id);
                    player.color = Match.TEAM_A_COLOR;
                    spawn = this.arena.getNextTeamASpawn();
                } else {
                    this.teamBPlayers.push(player.id);
                    player.color = Match.TEAM_B_COLOR;
                    spawn = this.arena.getNextTeamBSpawn();
                }
            }
            player.spawn(spawn);

            for (const otherPlayer of this.lobby.players) {
                if (otherPlayer !== player) {
                    otherPlayer.sendConnectedPlayerAddition(player);
                }
            }
        }

        this.matchStats = new MatchStatistics(this, this.teamAPlayers, this.teamBPlayers);
        this.matchStats.enable();
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

        (this.matchStats as MatchStatistics).disable();
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

    public hasOnlyBotsRemaining() {
        for (const player of this.lobby.players) {
            if (this.gamemode.isPlayerValid(player) && !player.isBot()) {
                return false;
            }
        }
        return true;
    }

    public addPlayer(player: Player): void { // adding spectator, not regular player
        player.sendPlayerSpectating();
        player.sendArena(this.arena.getRawData());
        this.powerupHandler.onPlayerAddition(player);

        for (const otherPlayer of this.lobby.players) {
            if (player !== otherPlayer && otherPlayer.isAlive) {
                player.sendConnectedPlayerAddition(otherPlayer);
            }
        }
    }

    public removePlayer(player: Player): void {
        let index = this.teamAPlayers.indexOf(player.id);
        if (index > -1) {
            this.teamAPlayers.splice(index, 1);
        } else {
            index = this.teamBPlayers.indexOf(player.id);

            if (index > -1) {
                this.teamBPlayers.splice(index, 1);
            } else {
                return; // player is spectating, cannot be removed.
            }
        }

        for (const otherPlayer of this.lobby.players) {
            otherPlayer.sendConnectedPlayerRemoval(player.id, -1);
        }
    }

    public getSpawn(player: Player): Vector4 {
        let index = this.teamAPlayers.indexOf(player.id);
        if (index > -1) {
            return this.arena.getNextTeamASpawn();
        } else {
            index = this.teamBPlayers.indexOf(player.id);
            if (index > -1) {
                return this.arena.getNextTeamBSpawn();
            } else {
                throw new Error("Player is not part of a team and cannot be spawned in.");
            }
        }
    }

    public onSameTeam(player: Player, otherPlayer: Player) {
        return this.teamAPlayers.indexOf(player.id) > -1 && this.teamAPlayers.indexOf(otherPlayer.id) > -1 || this.teamBPlayers.indexOf(player.id) > -1 && this.teamBPlayers.indexOf(otherPlayer.id) > -1;
    }

    public hasEnoughPlayers() {
        let teamAValid = false;
        let teamBValid = false;
        for (const player of this.lobby.players) {
            if (!teamAValid && this.teamAPlayers.indexOf(player.id) > -1) {
                if (this.gamemode.isPlayerValid(player)) {
                    teamAValid = true;
                    continue;
                }
            } else if (!teamBValid && this.teamBPlayers.indexOf(player.id) > -1) {
                if (this.gamemode.isPlayerValid(player)) {
                    teamBValid = true;
                    continue;
                }
            }
        }
        return teamAValid && teamBValid;
    }

    protected handlePlayerOutOfBounds(player: Player) {
        this.gamemode.handleOutOfBounds(player);
    }

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
