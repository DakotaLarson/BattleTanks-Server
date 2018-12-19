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
        // console.log("match end");
        // let amountToMove = lobby.players.length;
        // if (!lobby.isBelowRecommendedPlayerCount()) {
        //     amountToMove -= Arena.recommendedPlayerCount;
        // }
        // const availableSpace = this.getAvailableLobbySpace(this.lobbies, lobby);

        // console.log(availableSpace);
        // console.log(amountToMove);
        // if (availableSpace >= amountToMove && amountToMove) {
        //     this.sortLobbies(this.lobbies);
        //     this.migratePlayers(this.lobbies, lobby, amountToMove);
        //     return true;
        // }
        return false;
    }

    protected onPlayerJoin(player: Player): void {

        console.log("player join");

        /*
        Find a lobby below absolute recommended limit.
        If none exist, then find a lobby below absolute minimum limit
        If none exist, then find an already running lobby below the absolute maximum limit
        If none exist, then find a starting lobby below the absolute maximum limit
        Otherwise, create a new lobby.
        */

        const startingBelowRecLobbies = [];
        const runningBelowRecLobbies = [];

        const startingBelowMaxLobbies = [];
        const runningBelowMaxLobbies = [];

        const belowMinLobbies = [];

        // let spectatorCount = 0;

        for (const lobby of this.lobbies) {
            if (lobby.isBelowMinimumPlayerCount()) {
                belowMinLobbies.push(lobby);
            } else if (lobby.isBelowRecommendedPlayerCount()) {
                if (lobby.isStarting()) {
                    startingBelowRecLobbies.push(lobby);
                } else if (lobby.isRunning()) {
                    runningBelowRecLobbies.push(lobby);
                }
            } else if (lobby.isBelowMaximumPlayerCount()) {
                if (lobby.isStarting()) {
                    startingBelowMaxLobbies.push(lobby);
                } else if (lobby.isRunning()) {
                    runningBelowMaxLobbies.push(lobby);
                }
            }
           // spectatorCount += lobby.getSpectatorCount();
        }
        let lobby;
        if (startingBelowRecLobbies.length) {
            lobby = this.getMostFullLobby(startingBelowRecLobbies);
        } else if (runningBelowRecLobbies.length) {
            lobby = this.getMostFullLobby(runningBelowRecLobbies);
        } else if (belowMinLobbies.length) {
            lobby = this.getMostFullLobby(belowMinLobbies);
        } else {
            // if (spectatorCount + 1 >= Arena.minimumPlayerCount) {
            //     lobby = this.createLobby();
            //     this.migrateSpectators(this.lobbies, lobby, Math.min(spectatorCount, Arena.recommendedPlayerCount));
            // } else {
            //     if (runningBelowMaxLobbies.length) {
            //         lobby = this.getMostFullLobby(runningBelowMaxLobbies);
            //     } else if (startingBelowMaxLobbies.length) {
            //         lobby = this.getMostFullLobby(startingBelowMaxLobbies);
            //     } else {
            //         lobby = this.createLobby();
            //     }
            // }

            lobby = this.createLobby();
        }
        lobby.addPlayer(player);
    }

    protected onPlayerLeave(player: Player): void {
        console.log("player leave");
        for (const lobby of this.lobbies) {
            if (lobby.hasPlayer(player)) {
                lobby.removePayer(player);
                if (lobby.isEmpty()) {
                    lobby.disable();
                    this.lobbies.splice(this.lobbies.indexOf(lobby), 1);
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

    // private getAvailableLobbySpace(lobbies: Lobby[], exemptLobby: Lobby) {
    //     let playerCount = 0;
    //     for (const lobby of lobbies) {
    //         if (lobby !== exemptLobby) {
    //             playerCount +=  Math.max(Arena.recommendedPlayerCount - lobby.players.length, 0);
    //         }
    //     }
    //     return playerCount;
    // }

    // private sortLobbies(lobbies: Lobby[]) {
    //     lobbies.sort((a: Lobby, b: Lobby) => {
    //         return b.players.length - a.players.length;
    //     });
    // }

    // private migratePlayers(lobbies: Lobby[], currentLobby: TeamEliminationLobby, amountToMove: number) {
    //     console.log("migrating players");
    //     for (let i = 0; i < amountToMove; i ++) {
    //         const player = currentLobby.players[i];
    //         currentLobby.removePayer(player);
    //         for (const lobby of lobbies) {
    //             if (lobby.isBelowRecommendedPlayerCount() && lobby !== currentLobby) {
    //                 lobby.addPlayer(player);
    //                 break;
    //             }
    //         }
    //     }
    //     if (currentLobby.isEmpty()) {
    //         currentLobby.disable();
    //         this.lobbies.splice(this.lobbies.indexOf(currentLobby), 1);
    //     }
    // }

    // private migrateSpectators(lobbies: Lobby[], destinationLobby: Lobby, spectatorCount: number) {
    //     console.log("migrating spectators");
    //     let playersAdded = 0;
    //     for (const lobby of lobbies) {
    //         for (const player of lobby.spectators) {
    //             lobby.removePayer(player);
    //             destinationLobby.addPlayer(player);
    //             if (++ playersAdded === spectatorCount) {
    //                 return;
    //             }
    //         }
    //     }
    // }

    private createLobby() {
        console.log("lobby created");
        const lobby = new TeamEliminationLobby(this);
        lobby.enable();
        this.lobbies.push(lobby);
        return lobby;
    }
}
