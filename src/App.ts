import * as MatchRotator from './MatchRotator';
import * as WebSocketServer from './WebSocketServer';
import * as PlayerConnector from './PlayerConnector';
import * as EventHandler from './EventHandler';

MatchRotator.enable();
WebSocketServer.enable();
PlayerConnector.enable();

setInterval(() => {
    EventHandler.callEvent(EventHandler.Event.GAME_TICK);
}, 50);