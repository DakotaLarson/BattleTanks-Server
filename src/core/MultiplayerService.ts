import Arena from "../Arena";
import Player from "../entity/Player";
import PlayerHandler from "../entity/PlayerHandler";
import EventHandler from "../EventHandler";
import Lobby from "./Lobby";

export default class MultiplayerService {

    public start() {
        EventHandler.addListener(this, EventHandler.Event.PLAYER_JOIN, this.onPlayerJoin);
        EventHandler.addListener(this, EventHandler.Event.PLAYER_LEAVE, this.onPlayerLeave);

        EventHandler.addListener(this, EventHandler.Event.BOT_JOIN, this.onBotJoin);
        EventHandler.addListener(this, EventHandler.Event.BOT_LEAVE, this.onBotLeave);
    }

    public onMatchEnd(lobby: Lobby): boolean {
        EventHandler.callEvent(EventHandler.Event.BOTS_MATCH_END, lobby);
        const amountToMove = PlayerHandler.getLobbyPlayerCount(lobby);
        if (lobby.isBelowMaximumPlayerCount() && amountToMove) {
            const lobbies = PlayerHandler.getLobbies();
            const availableSpace = this.getAvailableLobbySpace(lobbies, lobby);
            if (availableSpace >= amountToMove) {
                const sortedLobbies = this.sortLobbies(lobbies);
                this.migratePlayers(sortedLobbies, lobby);
                return true;
            }
        }
        return false;
    }

    private onPlayerJoin(player: Player): void {

        /*
        Find a lobby below maximum that is starting.
        Otherwise, find a lobby below maximum that is running.
        Otherwise, find a lobby below minimum.
        Otherwise, create a new lobby.
        */

        const startingBelowMaxLobbies = [];
        const runningBelowMaxLobbies = [];

        const belowMinLobbies = [];

        for (const lobby of PlayerHandler.getLobbies()) {
            if (lobby.isBelowMinimumPlayerCount()) {
                belowMinLobbies.push(lobby);
            } else if (lobby.isBelowMaximumPlayerCount()) {
                if (lobby.isStarting()) {
                    startingBelowMaxLobbies.push(lobby);
                } else if (lobby.isRunning()) {
                    runningBelowMaxLobbies.push(lobby);
                }
            }
        }
        let lobby;
        if (startingBelowMaxLobbies.length) {
            lobby = this.getMostFullLobby(startingBelowMaxLobbies);
        } else if (runningBelowMaxLobbies.length) {
            lobby = this.getMostFullLobby(runningBelowMaxLobbies);
        } else if (belowMinLobbies.length) {
            lobby = this.getMostFullLobby(belowMinLobbies);
        } else {
            lobby = this.createLobby();
        }
        this.addPlayerToLobby(player, lobby);
    }

    private onPlayerLeave(player: Player): void {
        const lobbies = PlayerHandler.getLobbies();
        for (const lobby of lobbies) {
            if (PlayerHandler.lobbyHasPlayer(lobby, player)) {
                this.removePlayerFromLobby(player, lobby);
                if (lobby.isEmpty()) {
                    this.removeLobby(lobby);
                } else {
                    this.migrateWaitingPlayers(lobbies, lobby);
                }
            }
        }
        player.destroy();
    }

    private onBotJoin(data: any) {
        this.addPlayerToLobby(data.bot, data.lobby);
    }

    private onBotLeave(data: any) {
        // todo
    }

    private getMostFullLobby(lobbies: Lobby[]) {
        let mostFullLobby = lobbies[0];
        let playerCount = PlayerHandler.getLobbyPlayerCount(lobbies[0]);

        for (let i = 1; i < lobbies.length; i ++) {
            const lobby = lobbies[i];
            const lobbyPlayerCount = PlayerHandler.getLobbyPlayerCount(lobby);

            if (lobbyPlayerCount > playerCount) {
                mostFullLobby = lobby;
                playerCount = lobbyPlayerCount;
            }
        }

        return mostFullLobby;
    }

    private getAvailableLobbySpace(lobbies: IterableIterator<Lobby>, exemptLobby: Lobby) {
        let playerCount = 0;
        for (const lobby of lobbies) {
            if (lobby !== exemptLobby) {
                playerCount += Arena.maximumPlayerCount - PlayerHandler.getLobbyPlayerCount(lobby);
            }
        }
        return playerCount;
    }

    private sortLobbies(lobbies: IterableIterator<Lobby>) {

        const lobbyArr = Array.from(lobbies);

        lobbyArr.sort((a: Lobby, b: Lobby) => {
            return PlayerHandler.getLobbyPlayerCount(b) - PlayerHandler.getLobbyPlayerCount(a);
        });

        return lobbyArr;
    }

    private migratePlayers(lobbies: Lobby[], currentLobby: Lobby) {
        const players = PlayerHandler.removeAllPlayers(currentLobby);
        for (const player of players) {
            for (const lobby of lobbies) {
                if (lobby.isBelowMaximumPlayerCount() && lobby !== currentLobby) {
                    this.addPlayerToLobby(player, lobby);
                    break;
                }
            }
        }
        if (currentLobby.isEmpty()) {
            this.removeLobby(currentLobby);
        }
    }

    private migrateWaitingPlayers(lobbies: IterableIterator<Lobby>, destinationLobby: Lobby) {
        const playersToMove = Arena.maximumPlayerCount - PlayerHandler.getLobbyPlayerCount(destinationLobby);
        let movedPlayers = 0;
        for (const lobby of lobbies) {
            if (lobby !== destinationLobby && lobby.isBelowMinimumPlayerCount()) {
                if (PlayerHandler.getLobbyPlayerCount(lobby) <= playersToMove - movedPlayers) {
                    const players = this.removeAllPlayersFromLobby(lobby);

                    for (const player of players) {
                        this.addPlayerToLobby(player, destinationLobby);
                    }

                    if (lobby.isEmpty()) {
                        this.removeLobby(lobby);
                    }

                    movedPlayers += players.length;
                    if (movedPlayers === playersToMove) {
                        break;
                    }

                } else {
                    console.log("Found waiting arena with more players to move than available.");
                }
            }
        }
    }

    private createLobby() {
        const lobby = new Lobby(this);
        lobby.enable();
        PlayerHandler.addLobby(lobby);
        return lobby;
    }

    private removeLobby(lobby: Lobby) {
        lobby.disable();
        PlayerHandler.removeLobby(lobby);
    }

    private addPlayerToLobby(player: Player, lobby: Lobby) {
        PlayerHandler.addPlayer(lobby, player);
        lobby.addPlayer(player);
    }

    private removePlayerFromLobby(player: Player, lobby: Lobby) {
        PlayerHandler.removePlayer(lobby, player);
        lobby.removePlayer(player);
    }

    private removeAllPlayersFromLobby(lobby: Lobby) {
        const players = PlayerHandler.removeAllPlayers(lobby);
        lobby.removePlayers(players);
        return players;
    }
}
