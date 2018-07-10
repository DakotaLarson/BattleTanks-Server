import Component from 'Component';
import EventHandler from 'EventHandler';
const readline = require('readline');

export default class CommandLineReader extends Component{

    constructor(){
        super();
        this.interface = null;
    }

    enable = () => {
        this.interface = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.interface.on('line', this.onLine);
    };

    disable = () => {
        this.interface.close();
    };

    onLine = (line) => {
        if(line.toLowerCase() === 'exit'){
            EventHandler.callEvent(EventHandler.Event.COMMANDLINE_EXIT);
        }else{
            console.log('Unknown Command.');
        }
    };
};
