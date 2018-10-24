import Match from "../Match";
import Player from "../Player";

export default abstract class Gamemode {

    protected match: Match;
    constructor(match: Match) {
        this.match = match;
    }

    public abstract start(): void;
    protected abstract onDeath(target: Player, player: Player): void;
}
