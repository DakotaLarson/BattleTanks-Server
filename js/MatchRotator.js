const EventHandler = require('./EventHandler');
const ArenaLoader = require('./ArenaLoader');

let arena;
let players = [];

module.exports.enable = () => {
    EventHandler.addListener(EventHandler.Event.PLAYER_CONNECT, onPlayerConnect);
    EventHandler.addListener(EventHandler.Event.PLAYER_DISCONNECT, onPlayerDisconnect);
    EventHandler.addListener(EventHandler.Event.ARENALOADER_ARENA_LOAD, onWorldLoad);
    ArenaLoader.loadInitialArena();
};

onPlayerConnect = (player) => {
    if(players.indexOf(player) === -1){
        players.push(player);
    }

    if(arena){
        player.sendArena(arena);
    }

    console.log('Player: \'' + player.name + '\' connected');
};

onPlayerDisconnect = (data) => {
    let player = data.player;
    let index = players.indexOf(player);
    if(index > -1){
        players.splice(index, 1);
    }
    console.log('Player: \'' + player.name + '\' disconnected (' + data.code + ')');
};


onWorldLoad = (arenaData) => {
    arena = arenaData;
    for(let i = 0; i < players.length; i ++){
        players[i].sendArena(arena);
    }
};
