import ArenaLoader from "../ArenaLoader";
import InfiniteMatch from "../match/InfiniteMatch";
import Match from "../match/Match";
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
                if (match.isEmpty()) {
                    this.removeMatch(match);
                }
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
        const match = new InfiniteMatch(arena);
        this.matches.push(match);
        match.enable();
        console.log("Match created");
        return match;
    }

    private removeMatch(match: Match) {
        match.disable();
        const index = this.matches.indexOf(match);
        if (index > -1) {
            this.matches.splice(index, 1);
        }
        console.log("Match removed");
    }

}
