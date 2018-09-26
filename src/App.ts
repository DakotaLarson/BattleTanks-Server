import EventHandler from "./EventHandler";
import MatchRotator from "./MatchRotator";
import * as PlayerConnector from "./PlayerConnector";
import PlayerHandler from "./PlayerHandler";
import PlayerKillHandler from "./PlayerKillHandler";
import * as WebSocketServer from "./WebSocketServer";

MatchRotator.enable();
WebSocketServer.enable();
PlayerConnector.enable();
PlayerHandler.enable();
PlayerKillHandler.enable();

setInterval(() => {
    EventHandler.callEvent(EventHandler.Event.GAME_TICK);
}, 50);
