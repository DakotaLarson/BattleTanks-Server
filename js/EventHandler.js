const eventListeners = {};

module.exports.Event = {
    PLAYER_CONNECT: 0,
    WS_CONNECTION_CHECK: 1,
    WS_CONNECTION_UNRESPONSIVE: 2,
    WS_CONNECTION_CLOSED: 3
};//Latest Event #: 3 (Update upon event addition!)

module.exports.addListener = (event, callback) => {
    if(event in eventListeners){
        eventListeners[event].unshift(callback);
    }else{
        eventListeners[event] = [callback];
    }
};
module.exports.addMonitorListener = (event, callback) => {
    if(event in eventListeners){
        eventListeners[event].push(callback);
    }else{
        eventListeners[event] = [callback];
    }
};
 module.exports.removeListener = (event, callback) => {
    if(event in eventListeners){
        let callbackIndex = eventListeners[event].indexOf(callback);
        if(callbackIndex > -1){
            eventListeners[event].splice(callbackIndex, 1);
        }
    }
};
module.exports.callEvent = (event, argument) => {
    if(event in eventListeners){
        let callbacks = eventListeners[event];
        for(let i = 0; i < callbacks.length; i ++){
            callbacks[i](argument);
        }
    }
};
