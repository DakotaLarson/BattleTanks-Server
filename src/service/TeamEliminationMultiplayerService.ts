import Arena from "../Arena";
import Lobby from "../lobby/Lobby";
import TeamEliminationLobby from "../lobby/TeamEliminationLobby";
import Player from "../Player";
import MultiplayerService from "./MultiplayerService";

export default class TeamEliminationMultiplayerService extends MultiplayerService {

    protected lobbies: TeamEliminationLobby[];

    constructor() {
        super();
        this.lobbies = [];
    }

    public onMatchEnd(lobby: TeamEliminationLobby): boolean {
        const amountToMove = lobby.players.length;
        if (lobby.isBelowMaximumPlayerCount() && amountToMove) {
            const availableSpace = this.getAvailableLobbySpace(this.lobbies, lobby);
            if (availableSpace >= amountToMove) {
                this.sortLobbies(this.lobbies);
                this.migratePlayers(this.lobbies, lobby);
                return true;
            }
        }
        return false;
    }

    protected onPlayerJoin(player: Player): void {

        /*
        Find a lobby below maximum that is starting.
        Otherwise, find a lobby below maximum that is running.
        Otherwise, find a lobby below minimum.
        Otherwise, create a new lobby.
        */

        const startingBelowMaxLobbies = [];
        const runningBelowMaxLobbies = [];

        const belowMinLobbies = [];

        for (const lobby of this.lobbies) {
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
        lobby.addPlayer(player);
    }

    protected onPlayerLeave(player: Player): void {
        for (const lobby of this.lobbies) {
            if (lobby.hasPlayer(player)) {
                lobby.removePayer(player);
                if (lobby.isEnabled()) {
                    if (lobby.isEmpty()) {
                        lobby.disable();
                        this.lobbies.splice(this.lobbies.indexOf(lobby), 1);
                    } else {
                        this.migrateWaitingPlayers(this.lobbies, lobby);
                    }
                }
            }
        }
        player.destroy();
    }

    private getMostFullLobby(lobbies: Lobby[]) {
        let mostFullLobby = lobbies[0];
        let playerCount = lobbies[0].players.length;

        for (let i = 1; i < lobbies.length; i ++) {
            const lobby = lobbies[i];
            const lobbyPlayerCount = lobby.players.length;

            if (lobbyPlayerCount > playerCount) {
                mostFullLobby = lobby;
                playerCount = lobbyPlayerCount;
            }
        }

        return mostFullLobby;
    }

    private getAvailableLobbySpace(lobbies: Lobby[], exemptLobby: Lobby) {
        let playerCount = 0;
        for (const lobby of lobbies) {
            if (lobby !== exemptLobby) {
                playerCount += Arena.maximumPlayerCount - lobby.players.length;
            }
        }
        return playerCount;
    }

    private sortLobbies(lobbies: Lobby[]) {
        lobbies.sort((a: Lobby, b: Lobby) => {
            return b.players.length - a.players.length;
        });
    }

    private migratePlayers(lobbies: Lobby[], currentLobby: TeamEliminationLobby) {
        const players = currentLobby.removePlayers(currentLobby.players);
        for (const player of players) {
            for (const lobby of lobbies) {
                if (lobby.isBelowMaximumPlayerCount() && lobby !== currentLobby) {
                    lobby.addPlayer(player);
                    break;
                }
            }
        }
        if (currentLobby.isEmpty()) {
            currentLobby.disable();
            this.lobbies.splice(this.lobbies.indexOf(currentLobby), 1);
        }
    }

    private migrateWaitingPlayers(lobbies: TeamEliminationLobby[], destinationLobby: Lobby) {
        const playersToMove = Arena.maximumPlayerCount - destinationLobby.players.length;
        let movedPlayers = 0;
        for (const lobby of lobbies) {
            if (lobby !== destinationLobby && lobby.isBelowMinimumPlayerCount()) {
                if (lobby.players.length <= playersToMove) {
                    const players = lobby.removePlayers(lobby.players);

                    for (const player of players) {
                        destinationLobby.addPlayer(player);
                    }

                    if (lobby.isEmpty()) {
                        lobby.disable();
                        this.lobbies.splice(this.lobbies.indexOf(lobby), 1);
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
        const lobby = new TeamEliminationLobby(this);
        lobby.enable();
        this.lobbies.push(lobby);
        return lobby;
    }
}
