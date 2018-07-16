const WebSocket = require('ws');

import Component from 'Component';
import EventHandler from 'EventHandler';
import Player from 'Player';

export default class WebSocketServer extends Component{
    constructor(){
        super();
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

        // let str1 = 'test String';
        //
        // let buff1 = Buffer.from(str1);
        // console.log(buff1);
        // let str2 = buff1.toString('utf-8');
        // console.log(str2);
    };

    disable = () => {
        this.wss.close();
        clearInterval(this.connectionCheckerId);
    };

    handleConnection = (ws) => {
        let player = new Player(ws);
        EventHandler.callEvent(EventHandler.Event.PLAYER_CONNECT, player);
    };

    checkConnections = () => {
        // for(let ws of this.wss.clients){
        //     if(!ws.isAlive) ws.terminate();
        //     ws.isAlive = false;
        //     ws.ping();
        // }
        EventHandler.callEvent(EventHandler.Event.WS_CONNECTION_CHECK);
    };

    verifyClient = (info) => {
        return info.req.headers['sec-websocket-protocol'] === 'tanks-MP';
    }
};


