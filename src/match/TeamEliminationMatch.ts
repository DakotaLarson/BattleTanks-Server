import Arena from "../Arena";
import TeamEliminationGamemode from "../gamemode/TeamEliminationGamemode";
import TeamEliminationLobby from "../lobby/TeamEliminationLobby";
import Player from "../Player";
import TeamEliminationMatchStats from "../statistics/TeamEliminationMatchStatistics";
import Vector4 from "../vector/Vector4";
import Match from "./Match";

export default class TeamEliminationMatch extends Match {

    private static readonly TEAM_A_COLOR = 0x009247;
    private static readonly TEAM_B_COLOR = 0xcf2b36;

    protected gamemode: TeamEliminationGamemode;

    private teamAPlayers: number[];
    private teamBPlayers: number[];

    private matchStats: TeamEliminationMatchStats | undefined;

    constructor(arena: Arena, lobby: TeamEliminationLobby) {
        super(arena, lobby);
        this.gamemode = new TeamEliminationGamemode(this);

        this.teamAPlayers = [];
        this.teamBPlayers = [];
    }
    public run(): void {
        super.run();

        for (const player of this.lobby.players) {
            let spawn: Vector4;

            if (this.teamAPlayers.length < this.teamBPlayers.length) {
                this.teamAPlayers.push(player.id);
                player.color = TeamEliminationMatch.TEAM_A_COLOR;
                spawn = this.arena.getNextTeamASpawn();
            } else if (this.teamBPlayers.length < this.teamAPlayers.length) {
                this.teamBPlayers.push(player.id);
                player.color = TeamEliminationMatch.TEAM_B_COLOR;
                spawn = this.arena.getNextTeamBSpawn();
            } else {
                if (Math.random() >= 0.5) {
                    this.teamAPlayers.push(player.id);
                    player.color = TeamEliminationMatch.TEAM_A_COLOR;
                    spawn = this.arena.getNextTeamASpawn();
                } else {
                    this.teamBPlayers.push(player.id);
                    player.color = TeamEliminationMatch.TEAM_B_COLOR;
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

        this.matchStats = new TeamEliminationMatchStats(this, this.teamAPlayers, this.teamBPlayers);
        this.matchStats.enable();
    }

    public finish() {
        super.finish();
        (this.matchStats as TeamEliminationMatchStats).disable();
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
}
