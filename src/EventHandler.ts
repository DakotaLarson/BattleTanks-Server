const eventListeners = {};

export enum Event{

    //GAME
    GAME_TICK,

    //PLAYER
    PLAYER_JOIN,
    PLAYER_LEAVE,

    //WS
    WS_CONNECTION_CHECK,
    WS_CONNECTION_UNRESPONSIVE,
    WS_CONNECTION_CLOSED,
    WS_CONNECTION_OPENED,

    //ARENA LOADER
    ARENALOADER_ARENA_LOAD,
    ARENALOADER_NO_ARENAS,
};

export const addListener = (event, callback) => {
    if(event in eventListeners){
        eventListeners[event].unshift(callback);
    }else{
        eventListeners[event] = [callback];
    }
};
export const addMonitorListener = (event, callback) => {
    if(event in eventListeners){
        eventListeners[event].push(callback);
    }else{
        eventListeners[event] = [callback];
    }
};
export const removeListener = (event, callback) => {
    if(event in eventListeners){
        let callbackIndex = eventListeners[event].indexOf(callback);
        if(callbackIndex > -1){
            eventListeners[event].splice(callbackIndex, 1);
        }
    }
};
export const callEvent = (event, argument?) => {
    if(event in eventListeners){
        let callbacks = eventListeners[event];
        for(let i = 0; i < callbacks.length; i ++){
            callbacks[i](argument);
        }
    }
};
