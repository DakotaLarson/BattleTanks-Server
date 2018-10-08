import EventHandler from "./EventHandler";
import MatchRotator from "./MatchRotator";
import * as PlayerConnector from "./PlayerConnector";
import PlayerDamageHandler from "./PlayerDamageHandler";
import PlayerHandler from "./PlayerHandler";
import * as WebSocketServer from "./WebSocketServer";

MatchRotator.enable();
WebSocketServer.enable();
PlayerConnector.enable();
PlayerHandler.enable();
PlayerDamageHandler.enable();

setInterval(() => {
    EventHandler.callEvent(EventHandler.Event.GAME_TICK);
}, 50);
