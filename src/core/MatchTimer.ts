import PlayerHandler from "../entity/PlayerHandler";
import EventHandler from "../main/EventHandler";
import Match from "./Match";

export default class MatchTimer {

    private static readonly MESSAGE_TIMES = [15, 10, 5, 4, 3, 2, 1];
    private static readonly REPEATING_MESSAGE_TIME = 30;

    private time: number;
    private match: Match;
    private timeout: NodeJS.Timeout | undefined;

    constructor(time: number, match: Match) {
        this.time = time;
        this.match = match;
    }

    public start() {
        this.timeout = this.update();
        this.updatePlayerGameTimers(this.time);
    }

    public stop() {
        if (this.timeout) {
            clearInterval(this.timeout);
        }
    }

    private update() {
        return setInterval(() => {
            this.time --;

            this.updatePlayerGameTimers(this.time);

            if (this.time > 0) {
                if (this.time % MatchTimer.REPEATING_MESSAGE_TIME === 0 || MatchTimer.MESSAGE_TIMES.includes(this.time)) {
                    for (const player of PlayerHandler.getMatchPlayers(this.match)) {
                        player.sendChatMessage(JSON.stringify(this.constructChatMessage(this.time)));
                    }
                }
            } else {
                EventHandler.callEvent(EventHandler.Event.MATCH_TIMER_COMPLETE, this.match);
            }
        }, 1000);
    }

    private constructChatMessage(time: number) {
        const segments = [];
        segments.push({
            color: 0x50c878,
            text: "Match update: ",
        },
        {
            color: 0xffa500,
            text: "" + time,
        },
        {
            color: 0x50c878,
            text: " " + this.getTimeText(time) +  " remaining",
        });
        return segments;
    }

    private getTimeText(time: number) {
        if (time === 1) {
            return "second";
        }
        return "seconds";
    }

    private updatePlayerGameTimers(time: number) {
        const players = PlayerHandler.getMatchPlayers(this.match);

        for (const player of players) {
            player.sendGameTimerUpdate(time);
        }
    }
}
