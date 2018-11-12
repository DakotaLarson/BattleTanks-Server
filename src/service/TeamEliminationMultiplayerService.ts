import TeamEliminationLobby from "../lobby/TeamEliminationLobby";
import Player from "../Player";
import MultiplayerService from "./MultiplayerService";

export default class TeamEliminationMultiplayerService extends MultiplayerService {

    protected lobby: TeamEliminationLobby;

    constructor() {
        super();
        this.lobby = new TeamEliminationLobby();
    }

    protected onPlayerJoin(player: Player): void {
        this.lobby.addPlayer(player);
    }

    protected onPlayerLeave(player: Player): void {
        this.lobby.removePayer(player);
        player.destroy();
    }
}
