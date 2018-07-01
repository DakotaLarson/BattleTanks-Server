const Component = require('Component');
const EventHandler = require('EventHandler');
const readline = require('readline');

module.exports = class CLI extends Component{

    constructor(){
        super();
        this.rli = null;
    }

    enable = () => {
        this.rli = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.rli.on('line', this.onLine);
    };

    disable = () => {
        this.rli.close();
    };

    onLine = (line) => {
        console.log(line);
    };

};