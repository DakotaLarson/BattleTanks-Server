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

        if(status === GameStatus.WAITING){
            if(players.length >= MINIMUM_PLAYER_COUNT){
                updateStatus(GameStatus.PREPARING)
            }else{
                player.sendGameStatus(status);
            }
        }else{
            if(status === GameStatus.PREPARING || status === GameStatus.RUNNING){
                player.sendArena(arena);
            }
            player.sendGameStatus(status);
        }

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

updateStatus = (newStatus) => {
    status = newStatus;
    switch(newStatus){
        case GameStatus.WAITING:

            break;
        case GameStatus.PREPARING:
            ArenaLoader.loadArena();
            //todo send status and arena
            break;
        case GameStatus.RUNNING:
            //todo send arena and status
            break;
        case GameStatus.FINISHING:
            //todo send status
            break;
    }
    for(let i = 0; i < players.length; i ++){
        players[i].sendGameStatus(newStatus);
    }
};

const GameStatus = {
    WAITING: 0,
    PREPARING: 1,
    RUNNING: 2,
    FINISHING: 3
};
