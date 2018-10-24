import EventHandler from "../EventHandler";
import Match from "../Match";
import Player from "../Player";

export default abstract class MultiplayerService {

    protected matches: Match[];

    constructor() {
        this.matches = [];
    }

    public start() {
        EventHandler.addListener(this, EventHandler.Event.PLAYER_JOIN, this.onPlayerJoin);
    }

    protected abstract onPlayerJoin(player: Player): void;
    protected abstract onPlayerLeave(player: Player): void;

}
