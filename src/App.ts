import MatchRotator from './MatchRotator';
import * as WebSocketServer from './WebSocketServer';
import * as PlayerConnector from './PlayerConnector';
import PlayerHandler from './PlayerHandler';
import EventHandler from './EventHandler';
import PlayerShootHandler from './PlayerShootHandler';

MatchRotator.enable();
WebSocketServer.enable();
PlayerConnector.enable();
PlayerHandler.enable();
PlayerShootHandler.enable();

setInterval(() => {
    EventHandler.callEvent(EventHandler.Event.GAME_TICK);
}, 50);