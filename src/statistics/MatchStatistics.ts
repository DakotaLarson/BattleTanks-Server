import Match from "../core/Match";
import Player from "../entity/Player";
import PlayerHandler from "../entity/PlayerHandler";
import EventHandler from "../EventHandler";
import PlayerStatistic from "./PlayerStatistic";

export default class MatchStatistics {

    private match: Match;

    private teamAShots: number;
    private teamBShots: number;

    private teamAHits: number;
    private teamBHits: number;

    private teamAKills: number;
    private teamBKills: number;

    private teamAPlayerStatistics: Map<number, PlayerStatistic>;
    private teamBPlayerStatistics: Map<number, PlayerStatistic>;

    constructor(match: Match, teamAPlayers: Player[], teamBPlayers: Player[]) {
        this.match = match;

        this.teamAShots = 0;
        this.teamBShots = 0;

        this.teamAHits = 0;
        this.teamBHits = 0;

        this.teamAKills = 0;
        this.teamBKills = 0;

        this.teamAPlayerStatistics = new Map();
        this.teamBPlayerStatistics = new Map();

        for (const player of teamAPlayers) {
            this.teamAPlayerStatistics.set(player.id, new PlayerStatistic());
        }

        for (const player of teamBPlayers) {
            this.teamBPlayerStatistics.set(player.id, new PlayerStatistic());
        }
    }

    public enable() {
        EventHandler.addListener(this, EventHandler.Event.STATS_SHOT, this.onShot);
        EventHandler.addListener(this, EventHandler.Event.STATS_HIT, this.onHit);
        EventHandler.addListener(this, EventHandler.Event.STATS_KILL, this.onKill);
        EventHandler.addListener(this, EventHandler.Event.STATS_SEND, this.onSend);
        EventHandler.addListener(this, EventHandler.Event.PLAYER_LEAVE, this.onPlayerLeave);
    }

    public disable() {
        EventHandler.removeListener(this, EventHandler.Event.STATS_SHOT, this.onShot);
        EventHandler.removeListener(this, EventHandler.Event.STATS_HIT, this.onHit);
        EventHandler.removeListener(this, EventHandler.Event.STATS_KILL, this.onKill);
        EventHandler.removeListener(this, EventHandler.Event.STATS_SEND, this.onSend);
        EventHandler.removeListener(this, EventHandler.Event.PLAYER_LEAVE, this.onPlayerLeave);

        this.teamAPlayerStatistics.clear();
        this.teamBPlayerStatistics.clear();
    }

    private onSend(data: any) {
        if (data.match === this.match) {

            // The playerId is the id of the last player killed.
            const teamALost = this.teamAPlayerStatistics.has(data.playerId);
            const teamBLost = this.teamBPlayerStatistics.has(data.playerId);

            this.teamAPlayerStatistics.forEach((stat: PlayerStatistic, id: number) => {
                const stats = stat.getStatistics(!teamALost, this.teamAShots, this.teamAHits, this.teamAKills, this.teamBShots, this.teamBHits, this.teamBKills);
                PlayerHandler.getMatchPlayer(this.match, id).sendMatchStatistics(stats);
            });

            this.teamBPlayerStatistics.forEach((stat: PlayerStatistic, id: number) => {
                const stats = stat.getStatistics(!teamBLost, this.teamBShots, this.teamBHits, this.teamBKills, this.teamAShots, this.teamAHits, this.teamAKills);
                PlayerHandler.getMatchPlayer(this.match, id).sendMatchStatistics(stats);
            });
        }
    }

    private onShot(data: any) {
        if (data.match === this.match) {
            if (this.teamAPlayerStatistics.has(data.player)) {
                (this.teamAPlayerStatistics.get(data.player) as PlayerStatistic).incrementShots();

                this.teamAShots ++;
            } else if (this.teamBPlayerStatistics.has(data.player)) {
                (this.teamBPlayerStatistics.get(data.player) as PlayerStatistic).incrementShots();

                this.teamBShots ++;
            } else {
                console.warn("No stats registered for shot");
            }
        }
    }

    private onHit(data: any) {
        if (data.match === this.match) {
            if (this.teamAPlayerStatistics.has(data.player)) {
                (this.teamAPlayerStatistics.get(data.player) as PlayerStatistic).incrementHits();

                this.teamAHits ++;
            } else if (this.teamBPlayerStatistics.has(data.player)) {
                (this.teamBPlayerStatistics.get(data.player) as PlayerStatistic).incrementHits();

                this.teamBHits ++;
            } else {
                console.warn("No stats registered for hit");
            }
        }
    }

    private onKill(data: any) {
        // shooter is not guaranteed.
        if (data.match === this.match) {
            if (this.teamAPlayerStatistics.has(data.player)) {
                (this.teamAPlayerStatistics.get(data.player) as PlayerStatistic).incrementDeaths();

                if (this.teamBPlayerStatistics.has(data.shooter)) {
                    (this.teamBPlayerStatistics.get(data.shooter) as PlayerStatistic).incrementKills();

                    this.teamBKills ++;
                }
            } else if (this.teamBPlayerStatistics.has(data.player)) {
                (this.teamBPlayerStatistics.get(data.player) as PlayerStatistic).incrementDeaths();

                if (this.teamAPlayerStatistics.has(data.shooter)) {
                    (this.teamAPlayerStatistics.get(data.shooter) as PlayerStatistic).incrementKills();

                    this.teamAKills ++;
                }
            } else {
                console.log("No stats registered for death");
            }
        }
    }

    private onPlayerLeave(player: Player) {
        if (this.teamAPlayerStatistics.has(player.id)) {
            this.teamAPlayerStatistics.delete(player.id);
        }
        if (this.teamBPlayerStatistics.has(player.id)) {
            this.teamBPlayerStatistics.delete(player.id);
        }
    }
}
