import Audio from "./Audio";
import EventHandler from "./EventHandler";
import PlayerHandler from "./PlayerHandler";

export default class PlayerKillHandler {

    public static enable() {
        EventHandler.addListener(PlayerKillHandler, EventHandler.Event.PLAYER_HIT_PLAYER, PlayerKillHandler.onHit, EventHandler.Level.LOW);
    }

    public static onHit(data: any) {
        data.target.sendAlert("You were killed by: " + data.player.name);
        data.player.sendAlert("You killed: " + data.target.name);

        data.target.sendAudioRequest(Audio.LOSE);

        data.target.isAlive = false;
        const targetId = data.target.id;
        for (let i = 0; i < PlayerHandler.getCount(); i ++) {
            const player = PlayerHandler.getPlayer(i);
            if (player.id === targetId) {
                player.sendPlayerRemoval();

            } else {
                player.sendConnectedPlayerRemoval(targetId);
            }
        }
    }
}
