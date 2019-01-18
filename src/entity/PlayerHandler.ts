import Lobby from "../core/Lobby";
import Match from "../core/Match";
import Player from "../Player";

export default class PlayerHandler {

    public static addLobby(lobby: Lobby) {
        PlayerHandler.players.set(lobby, []);
    }

    public static removeLobby(lobby: Lobby) {
        PlayerHandler.players.delete(lobby);
    }

    public static addMatch(match: Match, lobby: Lobby) {
        this.matches.set(match, lobby);
    }

    public static removeMatch(match: Match) {
        this.matches.delete(match);
    }

    public static addPlayer(lobby: Lobby, player: Player) {
        const players = PlayerHandler.players.get(lobby);
        if (players !== undefined) {
            if (!players.includes(player)) {
                players.push(player);
            }
        } else {
            throw new Error("lobby doesn't have players");
        }
    }

    public static removePlayer(lobby: Lobby, player: Player) {
        const players = PlayerHandler.players.get(lobby);
        if (players !== undefined) {
            if (players.includes(player)) {
                players.splice(players.indexOf(player), 1);
            }
        } else {
            throw new Error("lobby doesn't have players");
        }
    }

    public static removeAllPlayers(lobby: Lobby) {
        const players = PlayerHandler.players.get(lobby);
        if (players !== undefined) {
            return players.splice(0, players.length);
        } else {
            throw new Error("lobby doesn't have players");
        }
    }

    public static lobbyHasPlayer(lobby: Lobby, player: Player) {
        const players = PlayerHandler.players.get(lobby);
        if (players !== undefined) {
            return players.includes(player);
        } else {
            throw new Error("lobby doesn't have players");
        }
    }

    public static matchHasPlayer(match: Match, player: Player) {
        const lobby = PlayerHandler.matches.get(match);
        if (lobby) {
            return PlayerHandler.lobbyHasPlayer(lobby, player);
        } else {
            throw new Error("Match not defined");
        }
    }

    public static getLobbyPlayers(lobby: Lobby) {
        const players = PlayerHandler.players.get(lobby);
        if (players !== undefined) {
            return players;
        } else {
            throw new Error("lobby doesn't have players");
        }
    }

    public static getMatchPlayers(match: Match) {
        const lobby = PlayerHandler.matches.get(match);
        if (lobby) {
            return PlayerHandler.getLobbyPlayers(lobby);
        } else {
            throw new Error("Match not defined");
        }
    }

    public static getLobbyPlayerCount(lobby: Lobby) {
        const players = PlayerHandler.players.get(lobby);
        if (players !== undefined) {
            return players.length;
        } else {
            throw new Error("lobby doesn't have players");
        }
    }

    public static getLobbies() {
        return PlayerHandler.players.keys();
    }

    // public static getLobbyMatch(selectedLobby: Lobby) {
    //     let selectedMatch;
    //     for (const [match, lobby] of PlayerHandler.matches) {
    //         if (lobby === selectedLobby) {
    //             if (selectedMatch) {
    //                 throw new Error("Multiple lobbies linked to same match");
    //             } else {
    //                 selectedMatch = match;
    //             }
    //         }
    //     }
    //     if (selectedMatch) {
    //         return selectedMatch;
    //     } else {
    //         throw new Error("No match found for lobby");
    //     }
    // }

    public static getMatchLobby(selectedMatch: Match) {
        const lobby = PlayerHandler.matches.get(selectedMatch);
        if (lobby) {
            return lobby;
        } else {
            throw new Error("No lobby found for match");
        }
    }

    private static players: Map<Lobby, Player[]> = new Map();
    private static matches: Map<Match, Lobby> = new Map();

}
