import Match from "../match/Match";
import Player from "../Player";

export default abstract class Gamemode {

    protected match: Match;
    constructor(match: Match) {
        this.match = match;
    }

    public abstract enable(): void;
    public abstract disable(): void;
    public abstract isPlayerValid(player: Player): boolean;
    protected abstract onDeath(target: Player, player: Player): void;
}
