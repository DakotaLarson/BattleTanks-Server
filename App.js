let Component = require('Component');
let Server = require('Server');

class App extends Component{

    constructor(){
        super();
        this.server = new Server();
    }

    start = ()  => {
        this.attachChild(this.server);
    };
}

(() => {
    let app = new App();
    app.start();
})();