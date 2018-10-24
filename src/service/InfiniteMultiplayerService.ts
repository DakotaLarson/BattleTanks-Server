import ArenaLoader from "../ArenaLoader";
import Match from "../Match";
import Player from "../Player";
import MultiplayerService from "./MultiplayerService";

export default class extends MultiplayerService {

    protected onPlayerJoin(player: Player): void {
        const match = this.getMatch();
        match.addPlayer(player);
    }

    protected onPlayerLeave(player: Player): void {
        for (const match of this.matches) {
            if (match.hasPlayer(player)) {
                match.removePlayer(player);
            }
        }
    }

    private getMatch(): Match {
        for (const match of this.matches) {
            if (!match.isFull() && !match.isFinished()) {
                return match;
            }
        }
        const newMatch = this.createMatch();
        return newMatch;
    }

    private createMatch(): Match {
        const arena = ArenaLoader.getRandomArena();
        const match = new Match(arena);
        this.matches.push(match);
        return match;
    }
}
