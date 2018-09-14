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
    Event[Event["PLAYER_SHOOT"] = 3] = "PLAYER_SHOOT";
    //WS
    Event[Event["WS_CONNECTION_CHECK"] = 4] = "WS_CONNECTION_CHECK";
    Event[Event["WS_CONNECTION_UNRESPONSIVE"] = 5] = "WS_CONNECTION_UNRESPONSIVE";
    Event[Event["WS_CONNECTION_CLOSED"] = 6] = "WS_CONNECTION_CLOSED";
    Event[Event["WS_CONNECTION_OPENED"] = 7] = "WS_CONNECTION_OPENED";
    //ARENA LOADER
    Event[Event["ARENALOADER_ARENA_LOAD"] = 8] = "ARENALOADER_ARENA_LOAD";
    Event[Event["ARENALOADER_NO_ARENAS"] = 9] = "ARENALOADER_NO_ARENAS";
})(Event = exports.Event || (exports.Event = {}));
;
var Level;
(function (Level) {
    Level[Level["LOW"] = 0] = "LOW";
    Level[Level["MEDIUM"] = 1] = "MEDIUM";
    Level[Level["HIGH"] = 2] = "HIGH";
})(Level || (Level = {}));
//Latest Event #: 64 (Append upon event addition.)
//Missing Event #s: NONE (Append on event removal; Use and remove from list for event addition when available.)
const lowListeners = new Map();
const mediumListeners = new Map();
const highListeners = new Map();
class EventHandler {
    static addListener(context, event, callback, level) {
        if (isNaN(Number(level))) {
            level = Level.MEDIUM;
        }
        let newListener = {
            context: context,
            callback: callback
        };
        let listeners;
        switch (level) {
            case Level.LOW:
                listeners = lowListeners;
                break;
            case Level.MEDIUM:
                listeners = mediumListeners;
                break;
            case Level.HIGH:
                listeners = highListeners;
                break;
        }
        let eventLevelListeners;
        if (listeners.has(event)) {
            eventLevelListeners = listeners.get(event);
        }
        else {
            eventLevelListeners = [];
        }
        eventLevelListeners.push(newListener);
        listeners.set(event, eventLevelListeners);
    }
    static removeListener(context, event, callback, level) {
        if (isNaN(Number(level))) {
            level = Level.MEDIUM;
        }
        let listeners;
        switch (level) {
            case Level.LOW:
                listeners = lowListeners;
                break;
            case Level.MEDIUM:
                listeners = mediumListeners;
                break;
            case Level.HIGH:
                listeners = highListeners;
                break;
        }
        if (listeners.has(event)) {
            let eventLevelListeners = listeners.get(event);
            let spliceIndex = -1;
            for (let i = 0; i < eventLevelListeners.length; i++) {
                let eventLevelListener = eventLevelListeners[i];
                if (eventLevelListener.context === context && eventLevelListener.callback === callback) {
                    spliceIndex = i;
                    break;
                }
            }
            if (spliceIndex > -1) {
                eventLevelListeners.splice(spliceIndex, 1);
                listeners.set(event, eventLevelListeners);
            }
            else {
                console.warn('Attempt to remove event listener was unsuccessful.');
            }
        }
    }
    static callEvent(event, argument) {
        //LOW
        if (lowListeners.has(event)) {
            let eventListeners = lowListeners.get(event);
            for (let i = 0; i < eventListeners.length; i++) {
                let listener = eventListeners[i];
                let context = listener.context;
                let callback = listener.callback;
                callback.call(context, argument);
            }
        }
        //MEDIUM
        if (mediumListeners.has(event)) {
            let eventListeners = mediumListeners.get(event);
            for (let i = 0; i < eventListeners.length; i++) {
                let listener = eventListeners[i];
                let context = listener.context;
                let callback = listener.callback;
                callback.call(context, argument);
            }
        }
        //HIGH
        if (highListeners.has(event)) {
            let eventListeners = highListeners.get(event);
            for (let i = 0; i < eventListeners.length; i++) {
                let listener = eventListeners[i];
                let context = listener.context;
                let callback = listener.callback;
                callback.call(context, argument);
            }
        }
    }
    static get Event() {
        return Event;
    }
    static get Level() {
        return Level;
    }
}
exports.default = EventHandler;
//# sourceMappingURL=EventHandler.js.map