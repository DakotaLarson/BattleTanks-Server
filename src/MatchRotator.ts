import Arena from "./Arena";
import ArenaLoader from "./ArenaLoader";
import Audio from "./Audio";
import EventHandler from "./EventHandler";
import Player from "./Player";
import PlayerHandler from "./PlayerHandler";
import PlayerShootHandler from "./PlayerShootHandler";
import Vector4 from "./vector/Vector4";

const MINIMUM_PLAYER_COUNT = 2;
const PREPARING_TIME = 3000;
const FINISHING_TIME = 3000;

let status: GameStatus;

// Players joining during finishing stage. Need to sync these players.
const playerIdsToSync: number[] = new Array();

enum GameStatus {
    WAITING,
    PREPARING,
    RUNNING,
    FINISHING,
}

export default class MatchRotator {
    public static enable = () => {
        EventHandler.addListener(MatchRotator, EventHandler.Event.PLAYER_JOIN, MatchRotator.onPlayerJoin);
        EventHandler.addListener(MatchRotator, EventHandler.Event.PLAYER_LEAVE, MatchRotator.onPlayerLeave);
        EventHandler.addListener(MatchRotator, EventHandler.Event.ARENALOADER_ARENA_LOAD, MatchRotator.onArenaLoad);
        EventHandler.addListener(MatchRotator, EventHandler.Event.ARENALOADER_NO_ARENAS, MatchRotator.onNoArenas);
        EventHandler.addListener(MatchRotator, EventHandler.Event.GAME_TICK, MatchRotator.onTick);
        EventHandler.addListener(MatchRotator, EventHandler.Event.PLAYER_HIT_PLAYER, MatchRotator.onPlayerHitPlayer);

        MatchRotator.setGameStatus(GameStatus.WAITING);
    }

    public static onPlayerJoin(player: Player) {

        if (status === GameStatus.WAITING) {
            if (PlayerHandler.getCount() >= MINIMUM_PLAYER_COUNT) {
                MatchRotator.startPreparing();
            } else {
                player.sendGameStatus(status);
            }
        } else {
            if (status === GameStatus.PREPARING || status === GameStatus.RUNNING) {
                const arena = ArenaLoader.getLoadedArena();
                player.sendArena(arena.getRawData());
                let spawn: Vector4;
                if (status === GameStatus.PREPARING) {
                    spawn = arena.getRandomInitialSpawn();
                } else {
                    spawn = arena.getNextGameSpawn();
                }
                player.sendPlayerAddition(spawn);
                for (let i = 0; i < PlayerHandler.getCount(); i ++) {
                    const otherPlayer = PlayerHandler.getPlayer(i);
                    const otherPlayerPos = new Vector4(otherPlayer.pos.x, otherPlayer.pos.y, otherPlayer.pos.z, otherPlayer.bodyRot);

                    if (otherPlayer.id === player.id) { continue; }

                    otherPlayer.sendConnectedPlayerAddition(player.id, player.name, spawn, player.headRot);
                    player.sendConnectedPlayerAddition(otherPlayer.id, otherPlayer.name, otherPlayerPos, otherPlayer.headRot);
                }

                player.sendAlert("Match starting soon!");
            } else if (status === GameStatus.FINISHING) {
                playerIdsToSync.push(player.id);
            }
            player.sendGameStatus(status);
        }

        console.log("Player: '" + player.name + "' connected");
    }

    public static onPlayerLeave(data: any) {
        const player: Player = data.player;

        if (status === GameStatus.RUNNING) {
            if (PlayerHandler.getCount() < MINIMUM_PLAYER_COUNT) {
                MatchRotator.startFinishing(); // change to start waiting??
            }
        }

        const syncIdIndex = playerIdsToSync.indexOf(player.id);
        if (syncIdIndex > -1) {
            playerIdsToSync.splice(syncIdIndex, 1);
        }

        for (let i = 0; i < PlayerHandler.getCount(); i ++) {
            PlayerHandler.getPlayer(i).sendConnectedPlayerRemoval(player.id);
        }

        console.log("Player: '" + player.name + "' disconnected (" + data.code + ")");
    }

    public static startWaiting() {
        for (let i = 0; i < PlayerHandler.getCount(); i ++) {
            PlayerHandler.getPlayer(i).sendGameStatus(GameStatus.WAITING);
        }

        playerIdsToSync.splice(0, playerIdsToSync.length);

        MatchRotator.setGameStatus(GameStatus.WAITING);
    }

    public static startPreparing() {
        ArenaLoader.loadArena();

        playerIdsToSync.splice(0, playerIdsToSync.length);

        for (let i = 0; i < PlayerHandler.getCount(); i ++) {
            const player: Player = PlayerHandler.getPlayer(i);
            const spawn: Vector4 = ArenaLoader.getLoadedArena().getRandomInitialSpawn();
            player.sendGameStatus(GameStatus.PREPARING);
            player.sendPlayerAddition(spawn);
            player.sendAlert("Match starting in 10 seconds!");

            for (let j = 0; j < PlayerHandler.getCount(); j ++) {
                const otherPlayer = PlayerHandler.getPlayer(j);
                if (otherPlayer.id === player.id) { continue; }
                otherPlayer.sendConnectedPlayerAddition(player.id, player.name, spawn, player.headRot);
            }
        }

        setTimeout(() => {
            if (PlayerHandler.getCount() >= MINIMUM_PLAYER_COUNT) {
                MatchRotator.startRunning();
            } else {
                MatchRotator.startWaiting();
            }
        }, PREPARING_TIME);

        MatchRotator.setGameStatus(GameStatus.PREPARING);
    }

    public static startRunning() {
        for (let i = 0; i < PlayerHandler.getCount(); i ++) {
            const player = PlayerHandler.getPlayer(i);
            player.isAlive = true;
            player.sendGameStatus(GameStatus.RUNNING);
            player.sendAlert("Match started!");
            player.sendCooldownTime(1);
            const gameSpawn = ArenaLoader.getLoadedArena().getNextGameSpawn();
            player.sendPlayerMove(gameSpawn);

        }

        MatchRotator.setGameStatus(GameStatus.RUNNING);
    }

    public static startFinishing(winner?: Player) {
        for (let i = 0; i < PlayerHandler.getCount(); i ++) {
            const player = PlayerHandler.getPlayer(i);
            player.sendGameStatus(GameStatus.FINISHING);
            player.sendPlayerRemoval();
            if (winner) {
                player.sendMatchStatistics({
                    winner: winner.name,
                });
            }

            for (let k = 0; k < PlayerHandler.getCount(); k ++) {
                const otherPlayer = PlayerHandler.getPlayer(k);
                if (otherPlayer.id === player.id) { continue; }
                otherPlayer.sendConnectedPlayerRemoval(player.id);
            }
        }

        setTimeout(() => {
            if (PlayerHandler.getCount() >= MINIMUM_PLAYER_COUNT) {
                MatchRotator.startPreparing();
            } else {
                MatchRotator.startWaiting();
            }
        }, FINISHING_TIME);

        MatchRotator.setGameStatus(GameStatus.FINISHING);
    }

    public static onArenaLoad(arena: Arena) {
        for (let i = 0; i < PlayerHandler.getCount(); i ++) {
            PlayerHandler.getPlayer(i).sendArena(arena.getRawData());
        }
        console.log("Loaded Arena: " + arena.title);
    }

    public static onTick() {
        for (let i = 0; i < PlayerHandler.getCount(); i ++) {
            const playerOne = PlayerHandler.getPlayer(i);
            if (playerIdsToSync.indexOf(playerOne.id) > -1) { continue; }
            for (let j = 0; j < PlayerHandler.getCount(); j ++) {
                const playerTwo = PlayerHandler.getPlayer(j);
                if (playerIdsToSync.indexOf(playerTwo.id) > -1) { continue; }
                if (playerOne.id !== playerTwo.id) {
                    playerTwo.sendConnectedPlayerMove(playerOne);
                }
            }
        }
    }

    public static onNoArenas() {
        console.log("There are no arenas loaded to start a match.");
    }

    public static setGameStatus(newStatus: GameStatus) {
        if (status === GameStatus.RUNNING) {
            PlayerShootHandler.disable();
        }
        if (newStatus === GameStatus.RUNNING) {
            PlayerShootHandler.enable();
        }
        console.log("GameStatus: " + newStatus);
        status = newStatus;
    }

    public static onPlayerHitPlayer() {
        let alivePlayerCount = 0;
        let winner: Player | undefined;
        for (let i = 0; i < PlayerHandler.getCount(); i ++) {
            const player = PlayerHandler.getPlayer(i);
            if (player.isAlive) {
                alivePlayerCount ++;
                winner = player;
            }
        }
        if (alivePlayerCount < 2) {
            if (alivePlayerCount === 1 && winner) {
                MatchRotator.startFinishing(winner);
                winner.sendAudioRequest(Audio.WIN);
            } else {
                MatchRotator.startFinishing();
            }
        }
    }
}
