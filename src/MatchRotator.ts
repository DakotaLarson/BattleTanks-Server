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

//Players joining during finishing stage. Need to sync these players.
let playerIdsToSync: Array<number> = new Array();

enum GameStatus{
    WAITING,
    PREPARING,
    RUNNING,
    FINISHING
};

export default class MatchRotator{
    static enable = () => {
        EventHandler.addListener(MatchRotator, EventHandler.Event.PLAYER_JOIN, MatchRotator.onPlayerJoin);
        EventHandler.addListener(MatchRotator, EventHandler.Event.PLAYER_LEAVE, MatchRotator.onPlayerLeave);
        EventHandler.addListener(MatchRotator, EventHandler.Event.ARENALOADER_ARENA_LOAD, MatchRotator.onArenaLoad);
        EventHandler.addListener(MatchRotator, EventHandler.Event.ARENALOADER_NO_ARENAS, MatchRotator.onNoArenas);
        EventHandler.addListener(MatchRotator, EventHandler.Event.GAME_TICK, MatchRotator.onTick);
        MatchRotator.setGameStatus(GameStatus.WAITING);
    };
    
    static onPlayerJoin(player: Player){
    
        if(status === GameStatus.WAITING){
            if(PlayerHandler.getCount() >= MINIMUM_PLAYER_COUNT){
                MatchRotator.startPreparing();
            }else{
                player.sendGameStatus(status);
            }
        }else{
            if(status === GameStatus.PREPARING || status === GameStatus.RUNNING){
                player.sendArena(arena);
                let spawn;
                if(status === GameStatus.PREPARING){
                    spawn = Arena.getRandomInitialSpawn();
                }else{
                    spawn = Arena.getRandomInitialSpawn(); //TODO CHANGE TO GAME SPAWN
                }
                player.sendPlayerAdd(spawn);
                for(let i = 0; i < PlayerHandler.getCount(); i ++){
                    let otherPlayer = PlayerHandler.getPlayer(i);
                    if(otherPlayer.id === player.id) continue;
                    otherPlayer.sendConnectedPlayerAddition(player.id, player.name, spawn, player.headRot, player.bodyRot);
                    player.sendConnectedPlayerAddition(otherPlayer.id, otherPlayer.name, otherPlayer.pos, otherPlayer.headRot, otherPlayer.bodyRot);
                }
    
                player.sendAlert('Match starting soon!');
            }else if(status === GameStatus.FINISHING){
                playerIdsToSync.push(player.id);
            }
            player.sendGameStatus(status);
        }
    
        console.log('Player: \'' + player.name + '\' connected');
    }
    
    static onPlayerLeave(data){
        let player: Player = data.player;
    
        if(status === GameStatus.RUNNING){
            if(PlayerHandler.getCount() < MINIMUM_PLAYER_COUNT){
                MatchRotator.startFinishing();
            }
        }

        let syncIdIndex = playerIdsToSync.indexOf(player.id);
        if(syncIdIndex > -1){
            playerIdsToSync.splice(syncIdIndex, 1);
        }

        for(let i = 0; i < PlayerHandler.getCount(); i ++){
            PlayerHandler.getPlayer(i).sendConnectedPlayerRemoval(player.id);
        }
    
        console.log('Player: \'' + player.name + '\' disconnected (' + data.code + ')');
    }
    
    static startWaiting(){
        for(let i = 0; i < PlayerHandler.getCount(); i ++){
            PlayerHandler.getPlayer(i).sendGameStatus(GameStatus.WAITING);
        }

        playerIdsToSync.splice(0, playerIdsToSync.length);

        MatchRotator.setGameStatus(GameStatus.WAITING);
    }
    
    static startPreparing(){
        ArenaLoader.loadArena();

        playerIdsToSync.splice(0, playerIdsToSync.length);
    
        for(let i = 0; i < PlayerHandler.getCount(); i ++){
            let player: Player = PlayerHandler.getPlayer(i);
            let spawn: Vector3 = Arena.getRandomInitialSpawn();
            player.sendGameStatus(GameStatus.PREPARING);
            player.sendPlayerAdd(spawn);
            player.sendAlert('Match starting in 10 seconds!');
    
            for(let j = 0; j < PlayerHandler.getCount(); j ++){
                let otherPlayer = PlayerHandler.getPlayer(j);
                if(otherPlayer.id === player.id) continue;
                otherPlayer.sendConnectedPlayerAddition(player.id, player.name, spawn, player.headRot, player.bodyRot);
            }
        }
    
        setTimeout(() => {
            if(PlayerHandler.getCount() >= MINIMUM_PLAYER_COUNT){
                MatchRotator.startRunning();
            }else{
                MatchRotator.startWaiting();
            }
        }, PREPARING_TIME);
    
        MatchRotator.setGameStatus(GameStatus.PREPARING);
    }
    
    static startRunning(){
        for(let i = 0; i < PlayerHandler.getCount(); i ++){
            let player = PlayerHandler.getPlayer(i);
            player.sendGameStatus(GameStatus.RUNNING);
            player.sendAlert('Match started!');
    
        }
    
        MatchRotator.setGameStatus(GameStatus.RUNNING);
    };
    
    static startFinishing(){
        for(let i = 0; i < PlayerHandler.getCount(); i ++){
            PlayerHandler.getPlayer(i).sendGameStatus(GameStatus.FINISHING);
        }
    
        setTimeout(() => {
            if(PlayerHandler.getCount() >= MINIMUM_PLAYER_COUNT){
                MatchRotator.startPreparing();
            }else{
                MatchRotator.startWaiting();
            }
        }, FINISHING_TIME);
    
        MatchRotator.setGameStatus(GameStatus.FINISHING);
    }
    
    static onArenaLoad(arenaData){
        arena = arenaData;
        Arena.update(arenaData);
        for(let i = 0; i < PlayerHandler.getCount(); i ++){
            PlayerHandler.getPlayer(i).sendArena(arena);
        }
        console.log('Loaded Arena: ' + arena.title);
    }
    
    static onTick(){
        for(let i = 0; i < PlayerHandler.getCount(); i ++){
            let playerOne = PlayerHandler.getPlayer(i);
            if(playerIdsToSync.indexOf(playerOne.id) > -1) continue;
            for(let j = 0; j < PlayerHandler.getCount(); j ++){
                let playerTwo = PlayerHandler.getPlayer(j);
                if(playerIdsToSync.indexOf(playerTwo.id) > -1) continue;
                if(playerOne.id !== playerTwo.id){
                    playerTwo.sendConnectedPlayerMove(playerOne.pos, playerOne.bodyRot, playerOne.headRot, playerOne.id);
                }
            }
        }
    }
    
    static onNoArenas(){
        console.log('There are no arenas loaded to start a match.');
    }
    
    static setGameStatus(newStatus){
        console.log('GameStatus: ' + newStatus);
        status = newStatus;
    }
}
