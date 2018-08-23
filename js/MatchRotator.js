const EventHandler = require('./EventHandler');
const ArenaLoader = require('./ArenaLoader');

const MINIMUM_PLAYER_COUNT = 2;
const PREPARING_TIME = 10000;
const FINISHING_TIME = 50000;

let arena;
let status;
const players = [];

module.exports.enable = () => {
    EventHandler.addListener(EventHandler.Event.PLAYER_JOIN, onPlayerJoin);
    EventHandler.addListener(EventHandler.Event.PLAYER_LEAVE, onPlayerLeave);
    EventHandler.addListener(EventHandler.Event.ARENALOADER_ARENA_LOAD, onWorldLoad);
    EventHandler.addListener(EventHandler.Event.ARENALOADER_NO_ARENAS, onNoArenas);
    status = GameStatus.WAITING;
};

const onPlayerJoin = (player) => {
    if(players.indexOf(player) === -1){
        players.push(player);

        if(status === GameStatus.WAITING){
            if(players.length >= MINIMUM_PLAYER_COUNT){
                startPreparing();
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

const onPlayerLeave = (data) => {
    let player = data.player;
    let index = players.indexOf(player);
    if(index > -1){
        players.splice(index, 1);

        if(status === GameStatus.RUNNING){
            if(players.length < MINIMUM_PLAYER_COUNT){
                startFinishing();
            }
        }
        console.log('Player: \'' + player.name + '\' disconnected (' + data.code + ')');
    }
};

const startWaiting = () => {
    for(let i = 0; i < players.length; i ++){
        players[i].sendGameStatus(GameStatus.WAITING);
    }

    status = GameStatus.WAITING;
};

const startPreparing = () => {
    ArenaLoader.loadArena();

    for(let i = 0; i < players.length; i ++){
        players[i].sendGameStatus(GameStatus.PREPARING);
    }

    setTimeout(() => {
        if(players.length >= MINIMUM_PLAYER_COUNT){
            startRunning();
        }else{
            startWaiting();
        }
    }, PREPARING_TIME);

    status = GameStatus.PREPARING;
};

const startRunning = () => {
    for(let i = 0; i < players.length; i ++){
        players[i].sendGameStatus(GameStatus.RUNNING);
    }

    status = GameStatus.RUNNING;
};

const startFinishing = () => {
    for(let i = 0; i < players.length; i ++){
        players[i].sendGameStatus(GameStatus.FINISHING);
    }

    setTimeout(() => {
        if(players.length >= MINIMUM_PLAYER_COUNT){
            startPreparing();
        }else{
            startWaiting();
        }
    }, FINISHING_TIME);

    status = GameStatus.FINISHING;
};

const onWorldLoad = (arenaData) => {
    arena = arenaData;
    for(let i = 0; i < players.length; i ++){
        players[i].sendArena(arena);
    }
    console.log('Loaded Arena: ' + arena.title);
};

const onNoArenas = () => {
    console.log('There are no arenas loaded to start a match.');
};

const GameStatus = {
    WAITING: 0,
    PREPARING: 1,
    RUNNING: 2,
    FINISHING: 3
};
