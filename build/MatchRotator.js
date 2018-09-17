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
//Players joining during finishing stage. Need to sync these players.
let playerIdsToSync = new Array();
var GameStatus;
(function (GameStatus) {
    GameStatus[GameStatus["WAITING"] = 0] = "WAITING";
    GameStatus[GameStatus["PREPARING"] = 1] = "PREPARING";
    GameStatus[GameStatus["RUNNING"] = 2] = "RUNNING";
    GameStatus[GameStatus["FINISHING"] = 3] = "FINISHING";
})(GameStatus || (GameStatus = {}));
;
class MatchRotator {
    static onPlayerJoin(player) {
        if (status === GameStatus.WAITING) {
            if (PlayerHandler_1.default.getCount() >= MINIMUM_PLAYER_COUNT) {
                MatchRotator.startPreparing();
            }
            else {
                player.sendGameStatus(status);
            }
        }
        else {
            if (status === GameStatus.PREPARING || status === GameStatus.RUNNING) {
                player.sendArena(arena);
                let spawn;
                if (status === GameStatus.PREPARING) {
                    spawn = Arena.getRandomInitialSpawn();
                }
                else {
                    spawn = Arena.getRandomInitialSpawn(); //TODO CHANGE TO GAME SPAWN
                }
                player.sendPlayerAdd(spawn);
                for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
                    let otherPlayer = PlayerHandler_1.default.getPlayer(i);
                    if (otherPlayer.id === player.id)
                        continue;
                    otherPlayer.sendConnectedPlayerAddition(player.id, player.name, spawn, player.headRot, player.bodyRot);
                    player.sendConnectedPlayerAddition(otherPlayer.id, otherPlayer.name, otherPlayer.pos, otherPlayer.headRot, otherPlayer.bodyRot);
                }
                player.sendAlert('Match starting soon!');
            }
            else if (status === GameStatus.FINISHING) {
                playerIdsToSync.push(player.id);
            }
            player.sendGameStatus(status);
        }
        console.log('Player: \'' + player.name + '\' connected');
    }
    static onPlayerLeave(data) {
        let player = data.player;
        if (status === GameStatus.RUNNING) {
            if (PlayerHandler_1.default.getCount() < MINIMUM_PLAYER_COUNT) {
                MatchRotator.startFinishing();
            }
        }
        let syncIdIndex = playerIdsToSync.indexOf(player.id);
        if (syncIdIndex > -1) {
            playerIdsToSync.splice(syncIdIndex, 1);
        }
        for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
            PlayerHandler_1.default.getPlayer(i).sendConnectedPlayerRemoval(player.id);
        }
        console.log('Player: \'' + player.name + '\' disconnected (' + data.code + ')');
    }
    static startWaiting() {
        for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
            PlayerHandler_1.default.getPlayer(i).sendGameStatus(GameStatus.WAITING);
        }
        playerIdsToSync.splice(0, playerIdsToSync.length);
        MatchRotator.setGameStatus(GameStatus.WAITING);
    }
    static startPreparing() {
        ArenaLoader.loadArena();
        playerIdsToSync.splice(0, playerIdsToSync.length);
        for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
            let player = PlayerHandler_1.default.getPlayer(i);
            let spawn = Arena.getRandomInitialSpawn();
            player.sendGameStatus(GameStatus.PREPARING);
            player.sendPlayerAdd(spawn);
            player.sendAlert('Match starting in 10 seconds!');
            for (let j = 0; j < PlayerHandler_1.default.getCount(); j++) {
                let otherPlayer = PlayerHandler_1.default.getPlayer(j);
                if (otherPlayer.id === player.id)
                    continue;
                otherPlayer.sendConnectedPlayerAddition(player.id, player.name, spawn, player.headRot, player.bodyRot);
            }
        }
        setTimeout(() => {
            if (PlayerHandler_1.default.getCount() >= MINIMUM_PLAYER_COUNT) {
                MatchRotator.startRunning();
            }
            else {
                MatchRotator.startWaiting();
            }
        }, PREPARING_TIME);
        MatchRotator.setGameStatus(GameStatus.PREPARING);
    }
    static startRunning() {
        for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
            let player = PlayerHandler_1.default.getPlayer(i);
            player.sendGameStatus(GameStatus.RUNNING);
            player.sendAlert('Match started!');
        }
        MatchRotator.setGameStatus(GameStatus.RUNNING);
    }
    ;
    static startFinishing() {
        for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
            PlayerHandler_1.default.getPlayer(i).sendGameStatus(GameStatus.FINISHING);
        }
        setTimeout(() => {
            if (PlayerHandler_1.default.getCount() >= MINIMUM_PLAYER_COUNT) {
                MatchRotator.startPreparing();
            }
            else {
                MatchRotator.startWaiting();
            }
        }, FINISHING_TIME);
        MatchRotator.setGameStatus(GameStatus.FINISHING);
    }
    static onArenaLoad(arenaData) {
        arena = arenaData;
        Arena.update(arenaData);
        for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
            PlayerHandler_1.default.getPlayer(i).sendArena(arena);
        }
        console.log('Loaded Arena: ' + arena.title);
    }
    static onTick() {
        for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
            let playerOne = PlayerHandler_1.default.getPlayer(i);
            if (playerIdsToSync.indexOf(playerOne.id) > -1)
                continue;
            for (let j = 0; j < PlayerHandler_1.default.getCount(); j++) {
                let playerTwo = PlayerHandler_1.default.getPlayer(j);
                if (playerIdsToSync.indexOf(playerTwo.id) > -1)
                    continue;
                if (playerOne.id !== playerTwo.id) {
                    playerTwo.sendConnectedPlayerMove(playerOne.pos, playerOne.bodyRot, playerOne.headRot, playerOne.id);
                }
            }
        }
    }
    static onNoArenas() {
        console.log('There are no arenas loaded to start a match.');
    }
    static setGameStatus(newStatus) {
        console.log('GameStatus: ' + newStatus);
        status = newStatus;
    }
}
MatchRotator.enable = () => {
    EventHandler_1.default.addListener(MatchRotator, EventHandler_1.default.Event.PLAYER_JOIN, MatchRotator.onPlayerJoin);
    EventHandler_1.default.addListener(MatchRotator, EventHandler_1.default.Event.PLAYER_LEAVE, MatchRotator.onPlayerLeave);
    EventHandler_1.default.addListener(MatchRotator, EventHandler_1.default.Event.ARENALOADER_ARENA_LOAD, MatchRotator.onArenaLoad);
    EventHandler_1.default.addListener(MatchRotator, EventHandler_1.default.Event.ARENALOADER_NO_ARENAS, MatchRotator.onNoArenas);
    EventHandler_1.default.addListener(MatchRotator, EventHandler_1.default.Event.GAME_TICK, MatchRotator.onTick);
    MatchRotator.setGameStatus(GameStatus.WAITING);
};
exports.default = MatchRotator;
//# sourceMappingURL=MatchRotator.js.map