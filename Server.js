const WebSocket = require('ws');

const CLI = require('CLI');
const Component = require('Component');

module.exports = class Server extends Component{
    constructor(){
        super();
    }

    enable = () => {
        this.wss = new WebSocket.Server({
            port: 8000
        });

        this.wss.on('connection', (ws)=> {
            ws.on('message', (message) => {
                console.log('received: ' + message);
                ws.send(message.toUpperCase());
            });
        });

    };

    disable = () => {
        this.wss.close();
    };
};


