import DatabaseHandler from "./DatabaseHandler";
import Player from "./entity/Player";
import EventHandler from "./EventHandler";

export default class PlayerTimer {

    private databaseHandler: DatabaseHandler;
    private joinTimes: Map<string, number>;

    constructor(databaseHandler: DatabaseHandler) {
        this.databaseHandler = databaseHandler;
        this.joinTimes = new Map();
    }

    public enable() {
        EventHandler.addListener(this, EventHandler.Event.PLAYER_JOIN, this.onPlayerJoin);
        EventHandler.addListener(this, EventHandler.Event.PLAYER_LEAVE, this.onPlayerLeave);
    }

    private onPlayerJoin(player: Player) {
        if (player.sub) {
            this.joinTimes.set(player.sub, Date.now());
        }
    }

    private onPlayerLeave(player: Player) {
        if (player.sub) {
            const joinTime = this.joinTimes.get(player.sub);
            if (joinTime) {
                this.joinTimes.delete(player.sub);

                const timePlayed = Math.round((Date.now() - joinTime) / 1000);
                this.databaseHandler.addPlayTime(player.sub, timePlayed);
            }
        }
    }
}
