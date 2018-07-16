const EventHandler = require('./EventHandler');

module.exports.enable = () => {
    EventHandler.addListener(EventHandler.Event.PLAYER_CONNECT, onPlayerConnect);
};

onPlayerConnect = () => {
};
