const WebSocket = require('ws');

import CommandLineReader from 'CommandLineReader';
import Component from 'Component';

export default class Server extends Component{
    constructor(){
        super();
        this.lineReader = new CommandLineReader();
    }

    enable = () => {
        this.wss = new WebSocket.Server({
            port: 8000
        });
        this.wss.on('connection', this.handleConnection);

        this.attachChild(this.lineReader);
    };

    disable = () => {
        this.wss.close();
        this.detachChild(this.lineReader);
    };

    handleConnection = (ws) => {
        ws.on('message', (message) => {
            console.log('received: ' + message);
            ws.send(message.toUpperCase());
        });
    };
};


