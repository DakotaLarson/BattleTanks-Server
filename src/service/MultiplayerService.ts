import EventHandler from "../EventHandler";
import Lobby from "../lobby/Lobby";
import Player from "../Player";

export default abstract class MultiplayerService {

    protected abstract lobbies: Lobby[];

    public start() {
        EventHandler.addListener(this, EventHandler.Event.PLAYER_JOIN, this.onPlayerJoin);
        EventHandler.addListener(this, EventHandler.Event.PLAYER_LEAVE, this.onPlayerLeave);
    }

    public abstract onMatchEnd(lobby: Lobby): boolean;
    protected abstract onPlayerJoin(player: Player): void;
    protected abstract onPlayerLeave(player: Player): void;

}
