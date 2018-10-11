import {performance} from "perf_hooks";
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

let time = performance.now();
setInterval(() => {
    const currentTime = performance.now();
    const delta = (currentTime - time) / 1000;
    time = currentTime;
    EventHandler.callEvent(EventHandler.Event.GAME_TICK, delta);
}, 50);
