import Arena from "../arena/Arena";
import Player from "../entity/Player";
import PlayerHandler from "../entity/PlayerHandler";
import EventHandler from "../EventHandler";
import PowerupHandler from "../powerup/PowerupHandler";
import ProjectileHandler from "../projectile/ProjectileHandler";
import MatchStatistics from "../statistics/MatchStatistics";
import Vector4 from "../vector/Vector4";
import Gamemode from "./gamemodes/Gamemode";
import { GamemodeType } from "./gamemodes/GamemodeType";
import TeamDeathmatch from "./gamemodes/TeamDeathmatch";
import TeamElimination from "./gamemodes/TeamElimination";
import { Team } from "./Team";

export default class Match {

    private static readonly TEAM_A_COLOR = 0xf00e30;
    private static readonly TEAM_B_COLOR = 0x0e52f0;

    public arena: Arena;

    private powerupHandler: PowerupHandler;

    private gamemode: Gamemode;

    private teamAPlayers: Player[];
    private teamBPlayers: Player[];

    private matchStats: MatchStatistics | undefined;

    private projectileHandler: ProjectileHandler;

    constructor(arena: Arena, gamemodeType: GamemodeType) {
        this.arena = arena;

        this.projectileHandler = new ProjectileHandler(this);
        this.powerupHandler = new PowerupHandler(this);

        if (gamemodeType === GamemodeType.TEAM_DEATHMATCH) {
            this.gamemode = new TeamDeathmatch(this);
        } else if (gamemodeType === GamemodeType.TEAM_ELIMINATION) {
            this.gamemode = new TeamElimination(this);
        } else {
            throw new Error("Unrecognized gamemode type:" + gamemodeType);
        }

        this.teamAPlayers = [];
        this.teamBPlayers = [];
    }

    public run() {
        EventHandler.addListener(this, EventHandler.Event.PLAYER_MOVE, this.onPlayerMove);

        for (const player of PlayerHandler.getMatchPlayers(this)) {
            player.sendArena(this.arena.getRawData());
        }
        this.projectileHandler.enable();
        this.powerupHandler.enable();
        this.gamemode.enable();

        for (const player of PlayerHandler.getMatchPlayers(this)) {

            if (this.teamAPlayers.length < this.teamBPlayers.length) {
                this.joinTeamA(player);
            } else if (this.teamBPlayers.length < this.teamAPlayers.length) {
                this.joinTeamB(player);
            } else {
                if (Math.random() >= 0.5) {
                    this.joinTeamA(player);
                } else {
                    this.joinTeamB(player);
                }
            }

            player.spawn(this.getSpawn(player));

            for (const otherPlayer of PlayerHandler.getMatchPlayers(this)) {
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

        for (const player of PlayerHandler.getMatchPlayers(this)) {
            player.despawn();
            for (const otherPlayer of PlayerHandler.getMatchPlayers(this)) {
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
        for (const otherPlayer of PlayerHandler.getMatchPlayers(this)) {
            if (otherPlayer === player) {
                return true;
            }
        }
        return false;
    }

    public getPlayerById(playerId: number): Player {
        for (const player of PlayerHandler.getMatchPlayers(this)) {
            if (player.id === playerId) {
                return player;
            }
        }
        throw new Error("Player not found with id: " + playerId);
    }

    public addPlayer(player: Player): void { // adding spectator, not regular player
        player.sendPlayerSpectating();
        player.sendArena(this.arena.getRawData());
        this.powerupHandler.onPlayerAddition(player);
        (this.matchStats as MatchStatistics).updateLateJoinPlayer(player);

        if (this.gamemode.getType() === GamemodeType.TEAM_DEATHMATCH) {
            this.joinTeamLate(player);
        }

        for (const otherPlayer of PlayerHandler.getMatchPlayers(this)) {
            if (player !== otherPlayer && otherPlayer.isAlive) {
                player.sendConnectedPlayerAddition(otherPlayer);
            }
        }
    }

    public removePlayer(player: Player): void {
        let index = this.teamAPlayers.indexOf(player);
        if (index > -1) {
            this.teamAPlayers.splice(index, 1);
        } else {
            index = this.teamBPlayers.indexOf(player);

            if (index > -1) {
                this.teamBPlayers.splice(index, 1);
            } else {
                return; // player is spectating, cannot be removed.
            }
        }

        for (const otherPlayer of PlayerHandler.getMatchPlayers(this)) {
            otherPlayer.sendConnectedPlayerRemoval(player.id);
        }

        if (this.matchStats) {
            this.matchStats.removePlayer(player);
        }
    }

    public getSpawn(player: Player): Vector4 {
        if (this.teamAPlayers.includes(player)) {
            return this.arena.getNextTeamASpawn();
        } else if (this.teamBPlayers.includes(player)) {
            return this.arena.getNextTeamBSpawn();
        } else {
            throw new Error("Player is not part of a team and cannot be spawned in.");
        }
    }

    public onSameTeam(player: Player, otherPlayer: Player) {
        return this.teamAPlayers.includes(player) && this.teamAPlayers.includes(otherPlayer) || this.teamBPlayers.includes(player) && this.teamBPlayers.includes(otherPlayer);
    }

    public getTeam(player: Player) {
        if (this.teamAPlayers.includes(player)) {
            return Team.A;
        } else if (this.teamBPlayers.includes(player)) {
            return Team.B;
        } else {
            return undefined;
        }
    }

    public hasEnoughPlayers() {
        let teamAValid = false;
        let teamBValid = false;
        for (const player of PlayerHandler.getMatchPlayers(this)) {
            if (!teamAValid && this.teamAPlayers.includes(player)) {
                if (this.gamemode.isPlayerValid(player)) {
                    teamAValid = true;
                    continue;
                }
            } else if (!teamBValid && this.teamBPlayers.includes(player)) {
                if (this.gamemode.isPlayerValid(player)) {
                    teamBValid = true;
                    continue;
                }
            }
        }
        return teamAValid && teamBValid;
    }

    public hasRealPlayers() {
        for (const player of PlayerHandler.getMatchPlayers(this)) {
            if (this.gamemode.isPlayerValid(player) && !player.isBot()) {
                return true;
            }
        }
        return false;
    }

    public getEnemies(player: Player) {
        const enemies = [];
        let otherPlayers;
        if (this.teamAPlayers.includes(player)) {
            otherPlayers = this.teamBPlayers;
        } else if (this.teamBPlayers.includes(player)) {
            otherPlayers = this.teamAPlayers;
        } else {
            throw new Error("Player not part of either team.");
        }
        for (const otherPlayer of otherPlayers) {
            if (otherPlayer.isAlive) {
                enemies.push(otherPlayer);
            }
        }
        return enemies;
    }

    private handlePlayerOutOfBounds(player: Player) {
        this.gamemode.handleOutOfBounds(player);
    }

    private onPlayerMove(player: Player) {

        if (this.hasPlayer(player)) {
            if (this.isPlayerInBounds(player, this.arena)) {
                for (const otherPlayer of PlayerHandler.getMatchPlayers(this)) {
                    if (player !== otherPlayer) {
                        otherPlayer.sendConnectedPlayerMove(player);
                    }
                }
            } else {
                this.handlePlayerOutOfBounds(player);
            }
        }
    }

    private isPlayerInBounds(player: Player, arena: Arena) {
        const xPos = player.position.x;
        const zPos = player.position.z;

        const width = arena.width + 2;
        const height = arena.height + 2;

        return xPos >= 0 && xPos <= width && zPos >= 0 && zPos <= height;
    }

    private joinTeamLate(player: Player) {
        const team = this.matchStats!.getWinningTeam();
        let joinedTeam: Team;
        if (team === Team.A) {
            this.joinTeamB(player);
            joinedTeam = Team.B;
        } else if (team === Team.B) {
            this.joinTeamA(player);
            joinedTeam = Team.A;
        } else {
            if (Math.random() >= 0.5) {
                this.joinTeamA(player);
                joinedTeam = Team.A;
            } else {
                this.joinTeamB(player);
                joinedTeam = Team.B;
            }
        }

        this.matchStats!.addLatePlayer(player, joinedTeam);
        this.gamemode!.spawn(player);
    }

    private joinTeamA(player: Player) {
        this.teamAPlayers.push(player);
        player.color = Match.TEAM_A_COLOR;
        return this.arena.getNextTeamASpawn();
    }

    private joinTeamB(player: Player) {
        this.teamBPlayers.push(player);
        player.color = Match.TEAM_B_COLOR;
        return this.arena.getNextTeamBSpawn();
    }
}
