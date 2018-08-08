const EventHandler = require('./EventHandler');
const ArenaLoader = require('./ArenaLoader');

const MINIMUM_PLAYER_COUNT = 2;

let arena;
let status;
const players = [];

module.exports.enable = () => {
    EventHandler.addListener(EventHandler.Event.PLAYER_JOIN, onPlayerJoin);
    EventHandler.addListener(EventHandler.Event.PLAYER_LEAVE, onPlayerLeave);
    EventHandler.addListener(EventHandler.Event.ARENALOADER_ARENA_LOAD, onWorldLoad);
    status = GameStatus.WAITING;
};

onPlayerJoin = (player) => {
    if(players.indexOf(player) === -1){
        players.push(player);
    }

    if(arena){
        player.sendArena(arena);
    }

    console.log('Player: \'' + player.name + '\' connected');
};

onPlayerLeave = (data) => {
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

updateStatus = (playerCount) => {
    switch(status){
        case GameStatus.WAITING:
            if(playerCount >= MINIMUM_PLAYER_COUNT){
                //start preparing
                status = GameStatus.PREPARING;
                ArenaLoader.loadArena();
            }else{
                //still waiting.
                //todo send status
            }
            break;
        case GameStatus.PREPARING:
            //todo send status and arena
            break;
        case GameStatus.RUNNING:
            //todo send arena and status
            break;
        case GameStatus.FINISHING:
            //todo send status
            break;
    }
};

const GameStatus = {
    WAITING: 0,
    PREPARING: 1,
    RUNNING: 2,
    FINISHING: 3
};
