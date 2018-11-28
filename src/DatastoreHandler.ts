import Datastore = require("@google-cloud/datastore");
import * as path from "path";
import EventHandler from "./EventHandler";
import Player from "./Player";

export default class DatastoreHandler {
    private datastore: Datastore;
    constructor() {
        this.datastore = new Datastore({
            projectId: "personal-187506",
            keyFilename: path.join(process.cwd(), "keys/Personal-acf83e71a128.json"),
        });
    }

    public start() {
        EventHandler.addListener(this, EventHandler.Event.PLAYER_JOIN, this.onPlayerJoin);
    }

    private onPlayerJoin(player: Player) {
        if (player.sub) {
            const key = this.datastore.key(["Player", player.sub]);

            this.datastore.get(key).then((existing) => {
                if (!(existing && existing.length && existing[0])) {
                    const data = {
                        wins: 0,
                        losses: 0,
                        kills: 0,
                        deaths: 0,
                    };
                    const entity = {
                        key,
                        data,
                    };
                    this.datastore.insert(entity).catch(console.error);
                }
            }).catch(console.error);
        }
    }
}
