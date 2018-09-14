"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventHandler_1 = require("./EventHandler");
const ArenaLoader = require("./ArenaLoader");
const Arena = require("./Arena");
const PlayerHandler_1 = require("./PlayerHandler");
const MINIMUM_PLAYER_COUNT = 2;
const PREPARING_TIME = 10000;
const FINISHING_TIME = 3000;
let arena;
let status;
exports.enable = () => {
    EventHandler_1.default.addListener(this, EventHandler_1.default.Event.PLAYER_JOIN, onPlayerJoin);
    EventHandler_1.default.addListener(this, EventHandler_1.default.Event.PLAYER_LEAVE, onPlayerLeave);
    EventHandler_1.default.addListener(this, EventHandler_1.default.Event.ARENALOADER_ARENA_LOAD, onArenaLoad);
    EventHandler_1.default.addListener(this, EventHandler_1.default.Event.ARENALOADER_NO_ARENAS, onNoArenas);
    EventHandler_1.default.addListener(this, EventHandler_1.default.Event.GAME_TICK, onTick);
    setGameStatus(GameStatus.WAITING);
};
const onPlayerJoin = (player) => {
    if (status === GameStatus.WAITING) {
        if (PlayerHandler_1.default.getCount() >= MINIMUM_PLAYER_COUNT) {
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
                for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
                    let otherPlayer = PlayerHandler_1.default.getPlayer(i);
                    if (otherPlayer.id === player.id)
                        continue;
                    otherPlayer.sendConnectedPlayerInitialSpawn(otherPlayer.id, otherPlayer.name, spawn, otherPlayer.headRot, otherPlayer.bodyRot);
                }
                player.sendAlert('Match starting soon!');
            }
        }
        player.sendGameStatus(status);
    }
    console.log('Player: \'' + player.name + '\' connected');
};
const onPlayerLeave = (data) => {
    let player = data.player;
    if (status === GameStatus.RUNNING) {
        if (PlayerHandler_1.default.getCount() < MINIMUM_PLAYER_COUNT) {
            startFinishing();
        }
    }
    console.log('Player: \'' + player.name + '\' disconnected (' + data.code + ')');
};
const startWaiting = () => {
    for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
        PlayerHandler_1.default.getPlayer(i).sendGameStatus(GameStatus.WAITING);
    }
    setGameStatus(GameStatus.WAITING);
};
const startPreparing = () => {
    ArenaLoader.loadArena();
    for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
        let player = PlayerHandler_1.default.getPlayer(i);
        let spawn = Arena.getRandomInitialSpawn();
        player.sendGameStatus(GameStatus.PREPARING);
        player.sendAssignedInitialSpawn(spawn);
        player.sendAlert('Match starting in 10 seconds!');
        for (let j = 0; j < PlayerHandler_1.default.getCount(); j++) {
            let otherPlayer = PlayerHandler_1.default.getPlayer(j);
            if (otherPlayer.id === player.id)
                continue;
            otherPlayer.sendConnectedPlayerInitialSpawn(player.id, player.name, spawn, player.headRot, player.bodyRot);
        }
    }
    setTimeout(() => {
        if (PlayerHandler_1.default.getCount() >= MINIMUM_PLAYER_COUNT) {
            startRunning();
        }
        else {
            startWaiting();
        }
    }, PREPARING_TIME);
    setGameStatus(GameStatus.PREPARING);
};
const startRunning = () => {
    for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
        let player = PlayerHandler_1.default.getPlayer(i);
        player.sendGameStatus(GameStatus.RUNNING);
        player.sendAlert('Match started!');
    }
    setGameStatus(GameStatus.RUNNING);
};
const startFinishing = () => {
    for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
        PlayerHandler_1.default.getPlayer(i).sendGameStatus(GameStatus.FINISHING);
    }
    setTimeout(() => {
        if (PlayerHandler_1.default.getCount() >= MINIMUM_PLAYER_COUNT) {
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
    for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
        PlayerHandler_1.default.getPlayer(i).sendArena(arena);
    }
    console.log('Loaded Arena: ' + arena.title);
};
const onTick = () => {
    for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
        for (let j = 0; j < PlayerHandler_1.default.getCount(); j++) {
            let playerOne = PlayerHandler_1.default.getPlayer(i);
            let playerTwo = PlayerHandler_1.default.getPlayer(j);
            if (playerOne.id !== playerTwo.id) {
                playerTwo.sendConnectedPlayerPositionUpdate(playerOne.pos, playerOne.bodyRot, playerOne.headRot, playerOne.id);
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