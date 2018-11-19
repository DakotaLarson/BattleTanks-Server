import Arena from "../Arena";
import TeamEliminationMatch from "../match/TeamEliminationMatch";
import Lobby from "./Lobby";

export default class TeamEliminationLobby extends Lobby {

    protected createMatch(arena: Arena): TeamEliminationMatch {
        const match = new TeamEliminationMatch(arena, this);
        match.run();
        return match;
    }
}
