enum Event {

    // GAME
    GAME_TICK,

    // PLAYER
    PLAYER_JOIN,
    PLAYER_LEAVE,
    PLAYER_SHOOT,
    PLAYER_MOVE,

    // WS
    WS_CONNECTION_CHECK,
    WS_CONNECTION_UNRESPONSIVE,
    WS_CONNECTION_CLOSED,
    WS_CONNECTION_OPENED,

    // ARENA LOADER
    ARENALOADER_ARENA_LOAD,
    ARENALOADER_NO_ARENAS,

    PROJECTILE_COLLISION,

    PLAYER_DAMAGE_HITSCAN,
    PLAYER_DAMAGE_PROJECTILE,

    CHAT_MESSAGE,
}

enum Level {
    LOW,
    MEDIUM,
    HIGH,
}

const lowListeners = new Map();
const mediumListeners = new Map();
const highListeners = new Map();

type eventCallback = (data?: any) => any;

export default class EventHandler {

    public static addListener(context: any, event: Event, callback: eventCallback, level?: Level) {
        if (isNaN(Number(level))) {
            level = Level.MEDIUM;
        }

        const newListener = {
            context,
            callback,
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

        if (listeners) {
            let eventLevelListeners;
            if (listeners.has(event)) {
                eventLevelListeners = listeners.get(event);
            } else {
                eventLevelListeners = [];
            }
            eventLevelListeners.push(newListener);
            listeners.set(event, eventLevelListeners);
        }
    }
    public static removeListener(context: any, event: Event, callback: eventCallback, level?: Level) {
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

        if (listeners) {
            if (listeners.has(event)) {
                const eventLevelListeners = listeners.get(event);
                let spliceIndex = -1;

                for (let i = 0; i < eventLevelListeners.length; i++) {
                    const eventLevelListener = eventLevelListeners[i];
                    if (eventLevelListener.context === context && eventLevelListener.callback === callback) {
                        spliceIndex = i;
                        break;
                    }
                }

                if (spliceIndex > -1) {
                    eventLevelListeners.splice(spliceIndex, 1);
                    listeners.set(event, eventLevelListeners);
                } else {
                    console.warn("Attempt to remove event listener was unsuccessful.");
                }
            }
        }
    }
    public static callEvent(event: Event, argument?: any) {
        // LOW
        if (lowListeners.has(event)) {
            const eventListeners = lowListeners.get(event);
            for (const listener of eventListeners) {

                const context = listener.context;
                const callback = listener.callback;

                callback.call(context, argument);
            }
        }
        // MEDIUM
        if (mediumListeners.has(event)) {
            const eventListeners = mediumListeners.get(event);

            for (const listener of eventListeners) {

                const context = listener.context;
                const callback = listener.callback;

                callback.call(context, argument);
            }
        }
        // HIGH
        if (highListeners.has(event)) {
            const eventListeners = highListeners.get(event);

            for (const listener of eventListeners) {

                const context = listener.context;
                const callback = listener.callback;
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
