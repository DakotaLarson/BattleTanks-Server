import Component from 'Component';
import EventHandler from 'EventHandler';
import WebSocketServer from 'WebSocketServer';
import WorldLoader from 'WorldLoader';
import CommandLineReader from "./CommandLineReader";

class App extends Component{

    constructor(){
        super();
        this.wsServer = new WebSocketServer();
        this.lineReader = new CommandLineReader();
        this.players = [];
    }

    start = ()  => {
        EventHandler.addListener(EventHandler.Event.COMMANDLINE_EXIT, this.handleCommandExit);
        EventHandler.addListener(EventHandler.Event.WORLDLOADER_WORLD_LOAD, this.handleWorldLoad);
        EventHandler.addListener(EventHandler.Event.PLAYER_CONNECT, this.handlePlayerConnect);
        EventHandler.addListener(EventHandler.Event.PLAYER_DISCONNECT, this.handlePlayerDisconnect);
        EventHandler.addListener(EventHandler.Event.WS_CONNECTION_UNRESPONSIVE, this.handlePlayerDisconnect);
        WorldLoader.loadInitialWorld();

        this.attachChild(this.wsServer);
        this.attachChild(this.lineReader);

    };

    stop = () => {
        EventHandler.removeListener(EventHandler.Event.COMMANDLINE_EXIT, this.handleCommandExit);
        EventHandler.removeListener(EventHandler.Event.WORLDLOADER_WORLD_LOAD, this.handleWorldLoad);
        EventHandler.removeListener(EventHandler.Event.PLAYER_CONNECT, this.handlePlayerConnect);
        EventHandler.removeListener(EventHandler.Event.PLAYER_DISCONNECT, this.handlePlayerDisconnect);
        EventHandler.removeListener(EventHandler.Event.WS_CONNECTION_UNRESPONSIVE, this.handlePlayerDisconnect);

        this.detachChild(this.wsServer);
        this.detachChild(this.lineReader);

    };

    handleCommandExit = () => {
        process.exit(0);
    };

    handleWorldLoad = (world) => {
        console.log(world);
    };

    handlePlayerConnect = (player) => {
        let index = this.players.indexOf(player);
        if(index === -1){
            this.players.push(player);
            this.attachChild(player);
        }else{
            console.log('Player added that already exists.');
        }
    };

    handlePlayerDisconnect = (player) => {
        let index = this.players.indexOf(player);
        if(index > -1){
            this.players.splice(index, 1);
            this.detachChild(player);
        }else{
            console.log('Player removed that doesn\'t exist.');
        }
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
