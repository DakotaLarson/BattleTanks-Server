import Component from 'Component';
import EventHandler from 'EventHandler';
import Server from 'Server';

class App extends Component{

    constructor(){
        super();
        this.server = new Server();
    }

    start = ()  => {
        EventHandler.addListener(EventHandler.Event.COMMANDLINE_EXIT, this.handleCommandExit);
        this.attachChild(this.server);
    };

    stop = () => {
        this.detachChild(this.server);
    };

    handleCommandExit = () => {
        process.exit(0);
    };
}

(() => {
    let app = new App();
    app.start();

    process.on('exit', () => {
        app.stop();
        console.log('Server Closed');
    });
    process.on('SIGINT', () => {
        EventHandler.callEvent(EventHandler.Event.COMMANDLINE_EXIT);
    })

})();
