import EventHandler from "./EventHandler";

export default class RankCalculator {

    public static readonly LEVELS_PER_RANK = 10;

    private static readonly RANKS = [
        "Recruit",
        "Private",
        "Corporal",
        "Sergeant",
        "Officer",
        "Lieutenant",
        "Commander",
        "Captain",
        "Major",
        "Colonel",
        "General",
    ];

    public static handlePointChange(id: string, username: string, points: number, increment: number) {
        const changeData = RankCalculator.isChanged(points, increment);
        if (changeData.level) {
            const body = JSON.stringify({
                username: "You",
                message: "are now level " + changeData.level,
            });
            EventHandler.callEvent(EventHandler.Event.NOTIFICATION_SEND, {
                type: "level_up",
                body,
                receiver: id,
            });
        }

        if (changeData.rank) {
            const body = JSON.stringify({
                username,
                message: "is now a " + changeData.rank,
            });
            EventHandler.callEvent(EventHandler.Event.NOTIFICATION_GLOBAL_SEND, {
                type: "rank_up",
                body,
            });
        }
    }

    private static isChanged(points: number, increment: number) {
        const prevData = RankCalculator.getData(points);
        const currentData = RankCalculator.getData(points + increment);

        return {
            level: prevData.level !== currentData.level ? currentData.level : 0,
            rank: prevData.rank !== currentData.rank ? currentData.rank : undefined,
        };
    }

    private static getData(points: number) {
        const level = Math.ceil(Math.pow(points, 1 / Math.E));
        const rankIndex = Math.min(Math.floor((level - 1) / RankCalculator.LEVELS_PER_RANK), RankCalculator.RANKS.length - 1);

        const rank = RankCalculator.RANKS[rankIndex];
        return {
            level: "" + level,
            rank,
        };
    }

}
