import Component from 'Component';
import EventHandler from 'EventHandler';

export default class Player extends Component{

    constructor(ws){
        super();
        this.ws = ws;
    }

    enable = () => {
        EventHandler.addListener(EventHandler.Event.WS_CONNECTION_CHECK, this.checkConnection);

        this.ws.on('message', (message) => {
            this.handleMessage(ws, message);
        });
        this.ws.on('close', (code, reason) => {
            this.handleClose(ws, code, reason);
        });
        this.ws.on('error', (error) => {
            this.handleError(ws, error);
        });
        this.ws.isAlive = true;
        this.ws.on('pong', () => {
            this.ws.isAlive = true;
        });
    };

    disable = () => {
        EventHandler.removeListener(EventHandler.Event.WS_CONNECTION_CHECK, this.checkConnection);
        this.ws.terminate();
    };

    handleMessage = (ws, message) => {
        if(message instanceof Buffer){
            console.log(message);
        }else{
            console.log('received ' + message);
        }
    };

    handleClose = (ws, code, reason) => {
        console.log('WS Closed: ' + code + ' ' + reason);
    };

    handleError = (ws, error) => {
        console.log(error);
    };

    checkConnection = () => {
        if(!this.ws.isAlive){
            EventHandler.callEvent(EventHandler.Event.WS_CONNECTION_UNRESPONSIVE, this);
        }else{
            this.ws.isAlive = false;
            this.ws.ping();
        }
    };
}
