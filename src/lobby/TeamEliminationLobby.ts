import Arena from "../Arena";
import TeamEliminationMatch from "../match/TeamEliminationMatch";
import Lobby from "./Lobby";

export default class TeamEliminationLobby extends Lobby {

    protected createMatch(arena: Arena, lobby: Lobby): TeamEliminationMatch {
        const match = new TeamEliminationMatch(arena, lobby);
        match.run();
        return match;
    }
}
