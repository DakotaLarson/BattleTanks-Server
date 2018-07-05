const WebSocket = require('ws');

import CommandLineReader from 'CommandLineReader';
import Component from 'Component';

export default class WebSocketServer extends Component{
    constructor(){
        super();
        this.lineReader = new CommandLineReader();
        this.wss = null;
    }

    enable = () => {
        this.wss = new WebSocket.Server({
            port: 8000,
            verifyClient: this.verifyClient
        });
        this.wss.on('listening', () => {
            console.log('WSS Listening...');
        });
        this.wss.on('connection', this.handleConnection);

        this.connectionCheckerId = setInterval(this.checkConnections, 30000, 30000);

        this.attachChild(this.lineReader);


    };

    disable = () => {
        this.wss.close();
        clearInterval(this.connectionCheckerId);
        this.detachChild(this.lineReader);
    };

    handleConnection = (ws) => {
        ws.on('message', (message) => {
            this.handleMessage(ws, message);
        });
        ws.on('close', (code, reason) => {
            this.handleClose(ws, code, reason);
        });
        ws.on('error', (error) => {
            this.handleError(ws, error);
        });
        ws.isAlive = true;
        ws.on('pong', () => {
            ws.isAlive = true;
        })
    };

    handleMessage = (ws, message) => {
        console.log('received ' + message);
        ws.send(message.toUpperCase());
    };

    handleClose = (ws, code, reason) => {
        console.log('WS Closed: ' + code + ' ' + reason);
    };

    handleError = (ws, error) => {
        console.log(error);
    };

    checkConnections = () => {
        for(let ws of this.wss.clients){
            if(!ws.isAlive) ws.terminate();
            ws.isAlive = false;
            ws.ping();
        }
    };

    verifyClient = (info) => {
        return info.req.headers['sec-websocket-protocol'] === 'tanks-MP';
    }
};


