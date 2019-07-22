import Arena from "../arena/Arena";
import Player from "../entity/Player";
import PlayerHandler from "../entity/PlayerHandler";
import EventHandler from "../EventHandler";
import Lobby from "./Lobby";

export default class MultiplayerService {

    public enable() {
        EventHandler.addListener(this, EventHandler.Event.PLAYER_JOIN, this.onPlayerJoin);
        EventHandler.addListener(this, EventHandler.Event.PLAYER_LEAVE, this.onPlayerLeave);

        EventHandler.addListener(this, EventHandler.Event.BOT_JOIN, this.onBotJoin);
        EventHandler.addListener(this, EventHandler.Event.BOT_LEAVE, this.onBotLeave);
    }

    public onMatchEnd(lobby: Lobby): boolean {
        EventHandler.callEvent(EventHandler.Event.BOTS_MATCH_END, lobby);

        const amountToMove = PlayerHandler.getLobbyPlayerCount(lobby);
        if (lobby.isBelowMaximumPlayerCount() && lobby.isPublic && amountToMove) {
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

    private onPlayerJoin(event: any): void {

        const player = event.player as Player;
        const lobbyData = event.lobby;

        let lobby: Lobby;

        if (lobbyData) {

            if (lobbyData.code) {

                const lobbySearchData = this.findLobbyWithCode(lobbyData.code);

                if (!lobbySearchData.success) {
                    player.sendAlert("Unable to find lobby with code: " + lobbyData.code + ". You were placed in a random lobby.");
                }

                lobby = lobbySearchData.lobby;
            } else if ("public" in lobbyData && "bots" in lobbyData) {
                lobby = this.createLobbyFromData(lobbyData);
            } else {
                lobby = this.findLobby();
            }
        } else {
            lobby = this.findLobby();
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
        this.removePlayerFromLobby(data.bot, data.lobby);
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
        if (destinationLobby.isPublic) {
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
    }

    private createLobby(fromData: boolean, isPublic: boolean, hasBots: boolean, code?: string) {
        const lobby = new Lobby(this, fromData, isPublic, hasBots, code);
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

    private findLobby() {
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
           if (lobby.isPublic) {
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
       }

       let lobby;
       if (startingBelowMaxLobbies.length) {
           lobby = this.getMostFullLobby(startingBelowMaxLobbies);
       } else if (runningBelowMaxLobbies.length) {
           lobby = this.getMostFullLobby(runningBelowMaxLobbies);
       } else if (belowMinLobbies.length) {
           lobby = this.getMostFullLobby(belowMinLobbies);
       } else {
        lobby = this.createLobby(false, true, true);
    }

       return lobby;
    }

    private findLobbyWithCode(code: string) {
        for (const lobby of PlayerHandler.getLobbies()) {
            if (lobby.code === code && lobby.isBelowMaximumPlayerCount()) {
                return {
                    success: true,
                    lobby,
                };
            }
        }

        return {
            success: false,
            lobby: this.findLobby(),
        };
    }

    private createLobbyFromData(lobbyData: any) {
        const code = this.generateCode();
        return this.createLobby(true, lobbyData.public, lobbyData.bots, code);
    }

    private generateCode(): string {
        const inclusiveMin = 65; // ASCII code 'A'
        const exclusiveMax = 91; // ASCII code after 'Z'
        const diff = exclusiveMax - inclusiveMin;

        const codes = [];
        for (let i = 0; i < 4; i ++) {
            codes.push(Math.floor(Math.random() * diff) + inclusiveMin);
        }

        const code = String.fromCharCode.apply(this, (codes));

        for (const lobby of PlayerHandler.getLobbies()) {
            if (lobby.code === code) {
                return this.generateCode();
            }
        }

        return code;
    }
}
