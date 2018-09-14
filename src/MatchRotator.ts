import EventHandler from './EventHandler';
import * as ArenaLoader from './ArenaLoader';
import * as Arena from './Arena';
import Player from './Player';
import PlayerHandler from './PlayerHandler';
import Vector3 from './Vector3';

const MINIMUM_PLAYER_COUNT = 2;
const PREPARING_TIME = 10000;
const FINISHING_TIME = 3000;

let arena;
let status: GameStatus;

export const enable = () => {
    EventHandler.addListener(this, EventHandler.Event.PLAYER_JOIN, onPlayerJoin);
    EventHandler.addListener(this, EventHandler.Event.PLAYER_LEAVE, onPlayerLeave);
    EventHandler.addListener(this, EventHandler.Event.ARENALOADER_ARENA_LOAD, onArenaLoad);
    EventHandler.addListener(this, EventHandler.Event.ARENALOADER_NO_ARENAS, onNoArenas);
    EventHandler.addListener(this, EventHandler.Event.GAME_TICK, onTick);
    setGameStatus(GameStatus.WAITING);
};

const onPlayerJoin = (player: Player) => {

    if(status === GameStatus.WAITING){
        if(PlayerHandler.getCount() >= MINIMUM_PLAYER_COUNT){
            startPreparing();
        }else{
            player.sendGameStatus(status);
        }
    }else{
        if(status === GameStatus.PREPARING || status === GameStatus.RUNNING){
            player.sendArena(arena);
            
            if(status === GameStatus.PREPARING){

                let spawn = Arena.getRandomInitialSpawn();
                player.sendAssignedInitialSpawn(spawn);
                for(let i = 0; i < PlayerHandler.getCount(); i ++){
                    let otherPlayer = PlayerHandler.getPlayer(i);
                    if(otherPlayer.id === player.id) continue;
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

    if(status === GameStatus.RUNNING){
        if(PlayerHandler.getCount() < MINIMUM_PLAYER_COUNT){
            startFinishing();
        }
    }

    console.log('Player: \'' + player.name + '\' disconnected (' + data.code + ')');
};

const startWaiting = () => {
    for(let i = 0; i < PlayerHandler.getCount(); i ++){
        PlayerHandler.getPlayer(i).sendGameStatus(GameStatus.WAITING);
    }

    setGameStatus(GameStatus.WAITING);
};

const startPreparing = () => {
    ArenaLoader.loadArena();

    for(let i = 0; i < PlayerHandler.getCount(); i ++){
        let player: Player = PlayerHandler.getPlayer(i);
        let spawn: Vector3 = Arena.getRandomInitialSpawn();
        player.sendGameStatus(GameStatus.PREPARING);
        player.sendAssignedInitialSpawn(spawn);
        player.sendAlert('Match starting in 10 seconds!');

        for(let j = 0; j < PlayerHandler.getCount(); j ++){
            let otherPlayer = PlayerHandler.getPlayer(j);
            if(otherPlayer.id === player.id) continue;
            otherPlayer.sendConnectedPlayerInitialSpawn(player.id, player.name, spawn, player.headRot, player.bodyRot);
        }
    }

    setTimeout(() => {
        if(PlayerHandler.getCount() >= MINIMUM_PLAYER_COUNT){
            startRunning();
        }else{
            startWaiting();
        }
    }, PREPARING_TIME);

    setGameStatus(GameStatus.PREPARING);
};

const startRunning = () => {
    for(let i = 0; i < PlayerHandler.getCount(); i ++){
        let player = PlayerHandler.getPlayer(i);
        player.sendGameStatus(GameStatus.RUNNING);
        player.sendAlert('Match started!');

    }

    setGameStatus(GameStatus.RUNNING);
};

const startFinishing = () => {
    for(let i = 0; i < PlayerHandler.getCount(); i ++){
        PlayerHandler.getPlayer(i).sendGameStatus(GameStatus.FINISHING);
    }

    setTimeout(() => {
        if(PlayerHandler.getCount() >= MINIMUM_PLAYER_COUNT){
            startPreparing();
        }else{
            startWaiting();
        }
    }, FINISHING_TIME);

    setGameStatus(GameStatus.FINISHING);
};

const onArenaLoad = (arenaData) => {
    arena = arenaData;
    Arena.update(arenaData);
    for(let i = 0; i < PlayerHandler.getCount(); i ++){
        PlayerHandler.getPlayer(i).sendArena(arena);
    }
    console.log('Loaded Arena: ' + arena.title);
};

const onTick = () => {
    for(let i = 0; i < PlayerHandler.getCount(); i ++){
        for(let j = 0; j < PlayerHandler.getCount(); j ++){
            let playerOne = PlayerHandler.getPlayer(i);
            let playerTwo = PlayerHandler.getPlayer(j);
            if(playerOne.id !== playerTwo.id){
                playerTwo.sendConnectedPlayerPositionUpdate(playerOne.pos, playerOne.bodyRot, playerOne.headRot, playerOne.id);
            }
        }
    }
}

const onNoArenas = () => {
    console.log('There are no arenas loaded to start a match.');
};

const setGameStatus = (newStatus) => {
    console.log('GameStatus: ' + newStatus);
    status = newStatus;
};

enum GameStatus{
    WAITING,
    PREPARING,
    RUNNING,
    FINISHING
};
