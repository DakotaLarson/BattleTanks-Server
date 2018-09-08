"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const eventListeners = {};
var Event;
(function (Event) {
    //GAME
    Event[Event["GAME_TICK"] = 0] = "GAME_TICK";
    //PLAYER
    Event[Event["PLAYER_JOIN"] = 1] = "PLAYER_JOIN";
    Event[Event["PLAYER_LEAVE"] = 2] = "PLAYER_LEAVE";
    //WS
    Event[Event["WS_CONNECTION_CHECK"] = 3] = "WS_CONNECTION_CHECK";
    Event[Event["WS_CONNECTION_UNRESPONSIVE"] = 4] = "WS_CONNECTION_UNRESPONSIVE";
    Event[Event["WS_CONNECTION_CLOSED"] = 5] = "WS_CONNECTION_CLOSED";
    Event[Event["WS_CONNECTION_OPENED"] = 6] = "WS_CONNECTION_OPENED";
    //ARENA LOADER
    Event[Event["ARENALOADER_ARENA_LOAD"] = 7] = "ARENALOADER_ARENA_LOAD";
    Event[Event["ARENALOADER_NO_ARENAS"] = 8] = "ARENALOADER_NO_ARENAS";
})(Event = exports.Event || (exports.Event = {}));
;
exports.addListener = (event, callback) => {
    if (event in eventListeners) {
        eventListeners[event].unshift(callback);
    }
    else {
        eventListeners[event] = [callback];
    }
};
exports.addMonitorListener = (event, callback) => {
    if (event in eventListeners) {
        eventListeners[event].push(callback);
    }
    else {
        eventListeners[event] = [callback];
    }
};
exports.removeListener = (event, callback) => {
    if (event in eventListeners) {
        let callbackIndex = eventListeners[event].indexOf(callback);
        if (callbackIndex > -1) {
            eventListeners[event].splice(callbackIndex, 1);
        }
    }
};
exports.callEvent = (event, argument) => {
    if (event in eventListeners) {
        let callbacks = eventListeners[event];
        for (let i = 0; i < callbacks.length; i++) {
            callbacks[i](argument);
        }
    }
};
//# sourceMappingURL=EventHandler.js.map