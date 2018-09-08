"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventHandler = require("./EventHandler");
const ArenaLoader = require("./ArenaLoader");
const Arena = require("./Arena");
const MINIMUM_PLAYER_COUNT = 2;
const PREPARING_TIME = 10000;
const FINISHING_TIME = 3000;
let arena;
let status;
const players = [];
exports.enable = () => {
    EventHandler.addListener(EventHandler.Event.PLAYER_JOIN, onPlayerJoin);
    EventHandler.addListener(EventHandler.Event.PLAYER_LEAVE, onPlayerLeave);
    EventHandler.addListener(EventHandler.Event.ARENALOADER_ARENA_LOAD, onArenaLoad);
    EventHandler.addListener(EventHandler.Event.ARENALOADER_NO_ARENAS, onNoArenas);
    EventHandler.addListener(EventHandler.Event.GAME_TICK, onTick);
    setGameStatus(GameStatus.WAITING);
};
const onPlayerJoin = (player) => {
    if (players.indexOf(player) === -1) {
        players.push(player);
        if (status === GameStatus.WAITING) {
            if (players.length >= MINIMUM_PLAYER_COUNT) {
                startPreparing();
            }
            else {
                player.sendGameStatus(status);
            }
        }
        else {
            if (status === GameStatus.PREPARING || status === GameStatus.RUNNING) {
                player.sendArena(arena);
                if (status === GameStatus.PREPARING) {
                    let spawn = Arena.getRandomInitialSpawn();
                    player.sendAssignedInitialSpawn(spawn);
                    for (let i = 0; i < players.length; i++) {
                        if (players[i].id === player.id)
                            continue;
                        players[i].sendConnectedPlayerInitialSpawn(player.id, player.name, spawn, player.headRot, player.bodyRot);
                    }
                    player.sendAlert('Match starting soon!');
                }
            }
            player.sendGameStatus(status);
        }
    }
    console.log('Player: \'' + player.name + '\' connected');
};
const onPlayerLeave = (data) => {
    let player = data.player;
    let index = players.indexOf(player);
    if (index > -1) {
        players.splice(index, 1);
        if (status === GameStatus.RUNNING) {
            if (players.length < MINIMUM_PLAYER_COUNT) {
                startFinishing();
            }
        }
        console.log('Player: \'' + player.name + '\' disconnected (' + data.code + ')');
    }
};
const startWaiting = () => {
    for (let i = 0; i < players.length; i++) {
        players[i].sendGameStatus(GameStatus.WAITING);
    }
    setGameStatus(GameStatus.WAITING);
};
const startPreparing = () => {
    ArenaLoader.loadArena();
    for (let i = 0; i < players.length; i++) {
        let player = players[i];
        let spawn = Arena.getRandomInitialSpawn();
        player.sendGameStatus(GameStatus.PREPARING);
        player.sendAssignedInitialSpawn(spawn);
        player.sendAlert('Match starting in 10 seconds!');
        for (let j = 0; j < players.length; j++) {
            if (players[j].id === player.id)
                continue;
            players[j].sendConnectedPlayerInitialSpawn(player.id, player.name, spawn, player.headRot, player.bodyRot);
        }
    }
    setTimeout(() => {
        if (players.length >= MINIMUM_PLAYER_COUNT) {
            startRunning();
        }
        else {
            startWaiting();
        }
    }, PREPARING_TIME);
    setGameStatus(GameStatus.PREPARING);
};
const startRunning = () => {
    for (let i = 0; i < players.length; i++) {
        players[i].sendGameStatus(GameStatus.RUNNING);
        players[i].sendAlert('Match started!');
    }
    setGameStatus(GameStatus.RUNNING);
};
const startFinishing = () => {
    for (let i = 0; i < players.length; i++) {
        players[i].sendGameStatus(GameStatus.FINISHING);
    }
    setTimeout(() => {
        if (players.length >= MINIMUM_PLAYER_COUNT) {
            startPreparing();
        }
        else {
            startWaiting();
        }
    }, FINISHING_TIME);
    setGameStatus(GameStatus.FINISHING);
};
const onArenaLoad = (arenaData) => {
    arena = arenaData;
    Arena.update(arenaData);
    for (let i = 0; i < players.length; i++) {
        players[i].sendArena(arena);
    }
    console.log('Loaded Arena: ' + arena.title);
};
const onTick = () => {
    for (let i = 0; i < players.length; i++) {
        for (let j = 0; j < players.length; j++) {
            if (players[i].id !== players[j].id) {
                players[j].sendConnectedPlayerPositionUpdate(players[i].pos, players[i].bodyRot, players[i].headRot, players[i].id);
            }
        }
    }
};
const onNoArenas = () => {
    console.log('There are no arenas loaded to start a match.');
};
const setGameStatus = (newStatus) => {
    console.log('GameStatus: ' + newStatus);
    status = newStatus;
};
var GameStatus;
(function (GameStatus) {
    GameStatus[GameStatus["WAITING"] = 0] = "WAITING";
    GameStatus[GameStatus["PREPARING"] = 1] = "PREPARING";
    GameStatus[GameStatus["RUNNING"] = 2] = "RUNNING";
    GameStatus[GameStatus["FINISHING"] = 3] = "FINISHING";
})(GameStatus || (GameStatus = {}));
;
//# sourceMappingURL=MatchRotator.js.map