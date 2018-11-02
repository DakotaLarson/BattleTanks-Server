import EventHandler from "../EventHandler";
import Lobby from "../lobby/Lobby";
import Player from "../Player";

export default abstract class MultiplayerService {

    protected abstract lobby: Lobby;

    public start() {
        EventHandler.addListener(this, EventHandler.Event.PLAYER_JOIN, this.onPlayerJoin);
        EventHandler.addListener(this, EventHandler.Event.PLAYER_LEAVE, this.onPlayerLeave);
    }

    protected abstract onPlayerJoin(player: Player): void;
    protected abstract onPlayerLeave(player: Player): void;

}
