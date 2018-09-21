"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MatchRotator_1 = require("./MatchRotator");
const WebSocketServer = require("./WebSocketServer");
const PlayerConnector = require("./PlayerConnector");
const PlayerHandler_1 = require("./PlayerHandler");
const EventHandler_1 = require("./EventHandler");
const PlayerKillHandler_1 = require("./PlayerKillHandler");
MatchRotator_1.default.enable();
WebSocketServer.enable();
PlayerConnector.enable();
PlayerHandler_1.default.enable();
PlayerKillHandler_1.default.enable();
setInterval(() => {
    EventHandler_1.default.callEvent(EventHandler_1.default.Event.GAME_TICK);
}, 50);
//# sourceMappingURL=App.js.map