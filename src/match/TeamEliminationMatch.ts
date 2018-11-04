import Arena from "../Arena";
import TeamEliminationGamemode from "../gamemode/TeamEliminationGamemode";
import Lobby from "../lobby/Lobby";
import Player from "../Player";
import Vector4 from "../vector/Vector4";
import Match from "./Match";

export default class TeamEliminationMatch extends Match {

    protected gamemode: TeamEliminationGamemode;

    private teamAPlayers: number[];
    private teamBPlayers: number[];

    constructor(arena: Arena, lobby: Lobby) {
        super(arena, lobby);
        this.gamemode = new TeamEliminationGamemode(this);

        this.teamAPlayers = [];
        this.teamBPlayers = [];
    }
    public run(): void {
        super.run();

        let addToTeamA = true;
        for (const player of this.lobby.players) {
            player.sendCooldownTime(1);

            let spawn: Vector4;

            if (addToTeamA) {
                this.teamAPlayers.push(player.id);
                spawn = this.arena.getNextTeamASpawn();
            } else {
                this.teamBPlayers.push(player.id);
                spawn = this.arena.getNextTeamBSpawn();
            }
            player.sendPlayerAddition(spawn);

            for (const otherPlayer of this.lobby.players) {
                if (otherPlayer !== player) {
                    otherPlayer.sendConnectedPlayerAddition(player.id, player.name, spawn, player.headRot);
                }
            }
            addToTeamA = !addToTeamA;
        }
    }
    public addPlayer(player: Player): void { // adding spectator, not regular player
        player.sendPlayerSpectating();
        player.sendArena(this.arena.getRawData());

        for (const otherPlayer of this.lobby.players) {
            if (player !== otherPlayer) {
                const pos = otherPlayer.position;
                player.sendConnectedPlayerAddition(otherPlayer.id, otherPlayer.name, new Vector4(pos.x, pos.y, pos.z, otherPlayer.bodyRot), otherPlayer.headRot);
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
            otherPlayer.sendConnectedPlayerRemoval(player.id);
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

    public getActivePlayerCount() {
        return this.teamAPlayers.length + this.teamBPlayers.length;
    }

    public onSameTeam(player: Player, otherPlayer: Player) {
        return this.teamAPlayers.indexOf(player.id) > -1 && this.teamAPlayers.indexOf(otherPlayer.id) > -1 || this.teamBPlayers.indexOf(player.id) > -1 && this.teamBPlayers.indexOf(otherPlayer.id) > -1;
    }
}
