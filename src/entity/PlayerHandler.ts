import Lobby from "../core/Lobby";
import Match from "../core/Match";
import Player from "../Player";

export default class PlayerHandler {

    public static addLobby(lobby: Lobby) {
        PlayerHandler.players.set(lobby, []);
        PlayerHandler.matches.set(lobby, undefined);
    }

    public static removeLobby(lobby: Lobby) {
        PlayerHandler.players.delete(lobby);
        PlayerHandler.matches.delete(lobby);
    }

    private static players: Map<Lobby, Player[]> = new Map();
    private static matches: Map<Lobby, Match | undefined> = new Map();

}
