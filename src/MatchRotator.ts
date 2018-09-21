import EventHandler from './EventHandler';
import ArenaLoader from './ArenaLoader';
import Arena from './Arena';
import Player from './Player';
import PlayerHandler from './PlayerHandler';
import Vector3 from './Vector3';
import PlayerKillHandler from './PlayerKillHandler';
import PlayerShootHandler from './PlayerShootHandler';

const MINIMUM_PLAYER_COUNT = 2;
const PREPARING_TIME = 3000;
const FINISHING_TIME = 3000;

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
        EventHandler.addListener(MatchRotator, EventHandler.Event.PLAYER_HIT_PLAYER, MatchRotator.onPlayerHitPlayer);

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
                let arena = ArenaLoader.getLoadedArena();
                player.sendArena(arena.getRawData());
                let spawn;
                if(status === GameStatus.PREPARING){
                    spawn = arena.getRandomInitialSpawn();
                }else{
                    spawn = arena.getNextGameSpawn();
                }
                player.sendPlayerAddition(spawn);
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
                MatchRotator.startWaiting();
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
            let spawn: Vector3 = ArenaLoader.getLoadedArena().getRandomInitialSpawn();
            player.sendGameStatus(GameStatus.PREPARING);
            player.sendPlayerAddition(spawn);
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
            player.isAlive = true;
            player.sendGameStatus(GameStatus.RUNNING);
            player.sendAlert('Match started!');
            player.sendPlayerMove(ArenaLoader.getLoadedArena().getNextGameSpawn());
    
        }
    
        MatchRotator.setGameStatus(GameStatus.RUNNING);
    };
    
    static startFinishing(winner?: Player){
        for(let i = 0; i < PlayerHandler.getCount(); i ++){
            let player = PlayerHandler.getPlayer(i);
            player.sendGameStatus(GameStatus.FINISHING);
            player.sendPlayerRemoval();
            if(winner){
                player.sendMatchStatistics({
                    winner: winner.name
                });
            }
            
            for(let k = 0; k < PlayerHandler.getCount(); k ++){
                let otherPlayer = PlayerHandler.getPlayer(k);
                if(otherPlayer.id === player.id) continue;
                otherPlayer.sendConnectedPlayerRemoval(player.id);
            }
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
    
    static onArenaLoad(arena: Arena){
        for(let i = 0; i < PlayerHandler.getCount(); i ++){
            PlayerHandler.getPlayer(i).sendArena(arena.getRawData());
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
    
    static setGameStatus(newStatus: GameStatus){
        if(status === GameStatus.RUNNING){
            PlayerShootHandler.disable();
        }
        if(newStatus === GameStatus.RUNNING){
            PlayerShootHandler.enable();
        }
        console.log('GameStatus: ' + newStatus);
        status = newStatus;
    }

    static onPlayerHitPlayer(){
        let alivePlayerCount = 0;
        let winner: Player;
        for(let i = 0; i < PlayerHandler.getCount(); i ++){
            let player = PlayerHandler.getPlayer(i);
            if(player.isAlive){
                alivePlayerCount ++;
                winner = player;
            }
            console.log(player.isAlive);
        }
        if(alivePlayerCount < 2){
            if(alivePlayerCount === 1){
                MatchRotator.startFinishing(winner);
            }else{
                MatchRotator.startFinishing();
            }
        }
    }
}
