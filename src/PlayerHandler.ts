import EventHandler from "./EventHandler";
import Player from "./Player";

const players: Player[] = new Array();

export default class PlayerHandler {

    public static enable() {
        EventHandler.addListener(undefined, EventHandler.Event.PLAYER_JOIN, PlayerHandler.onPlayerJoin, EventHandler.Level.LOW);
        EventHandler.addListener(undefined, EventHandler.Event.PLAYER_LEAVE, PlayerHandler.onPlayerLeave, EventHandler.Level.LOW);
        EventHandler.addListener(undefined, EventHandler.Event.PLAYER_SHOOT, PlayerHandler.onShoot);
    }

    public static onPlayerJoin(player: Player) {
        const index = players.indexOf(player);
        if (index === -1) {
            players.push(player);
            console.log("player added");
        } else {
            console.warn("Attempting to add player to list that is already in list");
        }
    }

    public static onPlayerLeave(data: any) {
        const player = data.player;
        const index = players.indexOf(player);
        if (index > -1) {
            players.splice(index, 1);
        } else {
            console.warn("Attempting to remove player that is not in list");
        }
    }

    public static getCount(): number {
        return players.length;
    }

    public static getPlayer(index: number): Player {
        return players[index];
    }

    public static getIndex(player: Player): number {
        return players.indexOf(player);
    }

    private static onShoot(player: Player) {
        for (const otherPlayer of players) {
            if (otherPlayer.id === player.id) {
                otherPlayer.sendPlayerShoot();
            } else {
                otherPlayer.sendConnectedPlayerShoot(player.id);
            }
        }
    }
}
