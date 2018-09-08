"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MatchRotator = require("./MatchRotator");
const WebSocketServer = require("./WebSocketServer");
const PlayerConnector = require("./PlayerConnector");
const EventHandler = require("./EventHandler");
MatchRotator.enable();
WebSocketServer.enable();
PlayerConnector.enable();
setInterval(() => {
    EventHandler.callEvent(EventHandler.Event.GAME_TICK);
}, 50);
//# sourceMappingURL=App.js.map