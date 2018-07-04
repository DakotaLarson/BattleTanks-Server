const eventListeners = {};

const Event = {
    COMMANDLINE_EXIT: 0

};//Latest Event #: 0 (Update upon event addition!)

export default class EventHandler{

    static addListener = (event, callback) => {
        if(eventListeners.hasOwnProperty(event)){
            eventListeners[event].unshift(callback);
        }else{
            eventListeners[event] = [callback];
        }
    };
    static addMonitorListener = (event, callback) => {
        if(eventListeners.hasOwnProperty(event)){
            eventListeners[event].push(callback);
        }else{
            eventListeners[event] = [callback];
        }
    };
    static removeListener = (event, callback) => {
        if(eventListeners.hasOwnProperty(event)){
            let callbackIndex = eventListeners[event].indexOf(callback);
            if(callbackIndex > -1){
                eventListeners[event].splice(callbackIndex, 1);
            }
        }
    };
    static callEvent = (event, argument) => {
        if(eventListeners.hasOwnProperty(event)){
            let callbacks = eventListeners[event];
            for(let i = 0; i < callbacks.length; i ++){
                callbacks[i](argument);
            }
        }
    };
    static get Event(){
        return Event;
    }
};
