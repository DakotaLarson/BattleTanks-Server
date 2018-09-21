"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventHandler_1 = require("./EventHandler");
const ArenaLoader_1 = require("./ArenaLoader");
const PlayerHandler_1 = require("./PlayerHandler");
const PlayerShootHandler_1 = require("./PlayerShootHandler");
const MINIMUM_PLAYER_COUNT = 2;
const PREPARING_TIME = 3000;
const FINISHING_TIME = 3000;
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
                let arena = ArenaLoader_1.default.getLoadedArena();
                player.sendArena(arena.getRawData());
                let spawn;
                if (status === GameStatus.PREPARING) {
                    spawn = arena.getRandomInitialSpawn();
                }
                else {
                    spawn = arena.getNextGameSpawn();
                }
                player.sendPlayerAddition(spawn);
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
                MatchRotator.startWaiting();
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
        ArenaLoader_1.default.loadArena();
        playerIdsToSync.splice(0, playerIdsToSync.length);
        for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
            let player = PlayerHandler_1.default.getPlayer(i);
            let spawn = ArenaLoader_1.default.getLoadedArena().getRandomInitialSpawn();
            player.sendGameStatus(GameStatus.PREPARING);
            player.sendPlayerAddition(spawn);
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
            player.isAlive = true;
            player.sendGameStatus(GameStatus.RUNNING);
            player.sendAlert('Match started!');
            player.sendPlayerMove(ArenaLoader_1.default.getLoadedArena().getNextGameSpawn());
        }
        MatchRotator.setGameStatus(GameStatus.RUNNING);
    }
    ;
    static startFinishing(winner) {
        for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
            let player = PlayerHandler_1.default.getPlayer(i);
            player.sendGameStatus(GameStatus.FINISHING);
            player.sendPlayerRemoval();
            if (winner) {
                player.sendMatchStatistics({
                    winner: winner.name
                });
            }
            for (let k = 0; k < PlayerHandler_1.default.getCount(); k++) {
                let otherPlayer = PlayerHandler_1.default.getPlayer(k);
                if (otherPlayer.id === player.id)
                    continue;
                otherPlayer.sendConnectedPlayerRemoval(player.id);
            }
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
    static onArenaLoad(arena) {
        for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
            PlayerHandler_1.default.getPlayer(i).sendArena(arena.getRawData());
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
        if (status === GameStatus.RUNNING) {
            PlayerShootHandler_1.default.disable();
        }
        if (newStatus === GameStatus.RUNNING) {
            PlayerShootHandler_1.default.enable();
        }
        console.log('GameStatus: ' + newStatus);
        status = newStatus;
    }
    static onPlayerHitPlayer() {
        let alivePlayerCount = 0;
        let winner;
        for (let i = 0; i < PlayerHandler_1.default.getCount(); i++) {
            let player = PlayerHandler_1.default.getPlayer(i);
            if (player.isAlive) {
                alivePlayerCount++;
                winner = player;
            }
            console.log(player.isAlive);
        }
        if (alivePlayerCount < 2) {
            if (alivePlayerCount === 1) {
                MatchRotator.startFinishing(winner);
            }
            else {
                MatchRotator.startFinishing();
            }
        }
    }
}
MatchRotator.enable = () => {
    EventHandler_1.default.addListener(MatchRotator, EventHandler_1.default.Event.PLAYER_JOIN, MatchRotator.onPlayerJoin);
    EventHandler_1.default.addListener(MatchRotator, EventHandler_1.default.Event.PLAYER_LEAVE, MatchRotator.onPlayerLeave);
    EventHandler_1.default.addListener(MatchRotator, EventHandler_1.default.Event.ARENALOADER_ARENA_LOAD, MatchRotator.onArenaLoad);
    EventHandler_1.default.addListener(MatchRotator, EventHandler_1.default.Event.ARENALOADER_NO_ARENAS, MatchRotator.onNoArenas);
    EventHandler_1.default.addListener(MatchRotator, EventHandler_1.default.Event.GAME_TICK, MatchRotator.onTick);
    EventHandler_1.default.addListener(MatchRotator, EventHandler_1.default.Event.PLAYER_HIT_PLAYER, MatchRotator.onPlayerHitPlayer);
    MatchRotator.setGameStatus(GameStatus.WAITING);
};
exports.default = MatchRotator;
//# sourceMappingURL=MatchRotator.js.map