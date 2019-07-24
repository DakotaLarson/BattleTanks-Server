import DatabaseHandler from "./database/DatabaseHandler";
import Player from "./entity/Player";
import EventHandler from "./EventHandler";
import ReferralHandler from "./ReferralHandler";

export default class PlayerTimer {

    private databaseHandler: DatabaseHandler;
    private referralHandler: ReferralHandler;

    private joinTimes: Map<string, number>;

    constructor(databaseHandler: DatabaseHandler, referralHandler: ReferralHandler) {
        this.databaseHandler = databaseHandler;
        this.referralHandler = referralHandler;

        this.joinTimes = new Map();
    }

    public enable() {
        EventHandler.addListener(this, EventHandler.Event.PLAYER_JOIN, this.onPlayerJoin);
        EventHandler.addListener(this, EventHandler.Event.PLAYER_LEAVE, this.onPlayerLeave);
    }

    private onPlayerJoin(event: any) {

        if (event.player.sub) {
            this.joinTimes.set(event.player.sub, Date.now());
        }
    }

    private onPlayerLeave(player: Player) {
        if (player.sub) {
            const joinTime = this.joinTimes.get(player.sub);
            if (joinTime) {
                this.joinTimes.delete(player.sub);

                const timePlayed = Math.round((Date.now() - joinTime) / 1000);
                this.databaseHandler.addPlayTime(player.sub, timePlayed);
                this.referralHandler.addPlayTime(player.sub, timePlayed);
            }
        }
    }
}
