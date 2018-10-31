import Arena from "../Arena";
import TeamEliminationGamemode from "../gamemode/TeamEliminationGamemode";
import Lobby from "../lobby/Lobby";
import Player from "../Player";
import Match from "./Match";

export default class TeamEliminationMatch extends Match {

    protected gamemode: TeamEliminationGamemode;

    constructor(arena: Arena, lobby: Lobby) {
        super(arena, lobby);
        this.gamemode = new TeamEliminationGamemode(this);
    }
    public run(): void {
        for (const player of this.lobby.players) {
            player.isAlive = true;
            // player.sendGameStatus(this.); TODO: replace this most likely
            player.sendAlert("Match started!");
            player.sendCooldownTime(1);

            const spawn = this.arena.getNextGameSpawn(); // TODO: replace with team spawns
            player.sendPlayerAddition(spawn);
        }

        this.projectileHandler.enable();

        this.gamemode.enable();
    }
    public addPlayer(player: Player): void { // adding spectator, not regular player
        player.sendArena(this.arena.getRawData());
    }
    public removePlayer(player: Player): void {
        throw new Error("Method not implemented.");
    }

}
