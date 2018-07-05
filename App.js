import Component from 'Component';
import EventHandler from 'EventHandler';
import WebSocketServer from 'WebSocketServer';

class App extends Component{

    constructor(){
        super();
        this.server = new WebSocketServer();
    }

    start = ()  => {
        EventHandler.addListener(EventHandler.Event.COMMANDLINE_EXIT, this.handleCommandExit);
        this.attachChild(this.server);
    };

    stop = () => {
        EventHandler.removeListener(EventHandler.Event.COMMANDLINE_EXIT, this.handleCommandExit);
        this.detachChild(this.server);
    };

    handleCommandExit = () => {
        process.exit(0);
    };
}

(() => {
    let app = new App();
    app.start();
    console.log('Server Running...');

    process.on('exit', () => {
        app.stop();
        console.log('Server Closed.');
    });
    process.on('SIGINT', () => {
        EventHandler.callEvent(EventHandler.Event.COMMANDLINE_EXIT);
    })

})();
