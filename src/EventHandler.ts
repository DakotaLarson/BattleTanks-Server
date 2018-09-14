const eventListeners = {};

export enum Event{

    //GAME
    GAME_TICK,

    //PLAYER
    PLAYER_JOIN,
    PLAYER_LEAVE,
    PLAYER_SHOOT,

    //WS
    WS_CONNECTION_CHECK,
    WS_CONNECTION_UNRESPONSIVE,
    WS_CONNECTION_CLOSED,
    WS_CONNECTION_OPENED,

    //ARENA LOADER
    ARENALOADER_ARENA_LOAD,
    ARENALOADER_NO_ARENAS,
};

enum Level{
    LOW,
    MEDIUM,
    HIGH
}
//Latest Event #: 64 (Append upon event addition.)
//Missing Event #s: NONE (Append on event removal; Use and remove from list for event addition when available.)

const lowListeners = new Map();
const mediumListeners = new Map();
const highListeners = new Map();

type eventCallback = (data?: any) => any;


export default class EventHandler{

    static addListener(context: any, event: Event, callback: eventCallback, level?: Level){
        if(isNaN(Number(level))){
            level = Level.MEDIUM;
        }

        let newListener = {
            context: context,
            callback: callback
        }

        let listeners;
        switch(level){
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
        if(listeners.has(event)){
            eventLevelListeners = listeners.get(event);
        }else{
            eventLevelListeners = [];
        }
        eventLevelListeners.push(newListener);
        listeners.set(event, eventLevelListeners);
    }
    static removeListener(context: any, event: Event, callback: eventCallback, level?: Level){
        if(isNaN(Number(level))){
            level = Level.MEDIUM;
        }

        let listeners;
        switch(level){
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

        if(listeners.has(event)){
            let eventLevelListeners = listeners.get(event);
            let spliceIndex = -1;

            for (let i = 0; i < eventLevelListeners.length; i++) {
                let eventLevelListener = eventLevelListeners[i];
                if(eventLevelListener.context === context && eventLevelListener.callback === callback){
                    spliceIndex = i;
                    break;
                }
            }

            if(spliceIndex > -1){
                eventLevelListeners.splice(spliceIndex, 1);
                listeners.set(event, eventLevelListeners);
            }else{
                console.warn('Attempt to remove event listener was unsuccessful.');
            }
        }
    }
    static callEvent(event: Event, argument?: any){
        //LOW
        if(lowListeners.has(event)){
            let eventListeners = lowListeners.get(event);
            for(let i = 0; i < eventListeners.length; i ++){

                let listener = eventListeners[i];
                let context = listener.context;
                let callback = listener.callback;
                
                callback.call(context, argument);
            }
        }
        //MEDIUM
        if(mediumListeners.has(event)){
            let eventListeners = mediumListeners.get(event);
            
            for(let i = 0; i < eventListeners.length; i ++){

                let listener = eventListeners[i];
                let context = listener.context;
                let callback = listener.callback;

                callback.call(context, argument);
            }
        }
        //HIGH
        if(highListeners.has(event)){
            let eventListeners = highListeners.get(event);
            for(let i = 0; i < eventListeners.length; i ++){
                let listener = eventListeners[i];
                let context = listener.context;
                let callback = listener.callback;
                callback.call(context, argument);
            }
        }
    }
    static get Event(){
        return Event;
    }

    static get Level(){
        return Level;
    }
}