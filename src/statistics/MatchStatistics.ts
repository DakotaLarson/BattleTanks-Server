import Audio from "../core/Audio";
import Match from "../core/Match";
import { Team } from "../core/Team";
import Player from "../entity/Player";
import PlayerHandler from "../entity/PlayerHandler";
import EventHandler from "../main/EventHandler";
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
    }

    public disable() {
        EventHandler.removeListener(this, EventHandler.Event.STATS_SHOT, this.onShot);
        EventHandler.removeListener(this, EventHandler.Event.STATS_HIT, this.onHit);
        EventHandler.removeListener(this, EventHandler.Event.STATS_KILL, this.onKill);
        EventHandler.removeListener(this, EventHandler.Event.STATS_SEND, this.onSend);

        this.teamAPlayerStatistics.clear();
        this.teamBPlayerStatistics.clear();
    }

    public removePlayer(player: Player) {
        let playerStatistic = this.teamAPlayerStatistics.get(player.id);
        if (playerStatistic) {
            const stat = playerStatistic.getEarlyStatistic();
            this.updateDatbaseStat(player, stat);
            this.teamAPlayerStatistics.delete(player.id);
        }
        playerStatistic = this.teamBPlayerStatistics.get(player.id);
        if (playerStatistic) {
            const stat = playerStatistic.getEarlyStatistic();
            this.updateDatbaseStat(player, stat);
            this.teamBPlayerStatistics.delete(player.id);
        }
    }

    public updateLateJoinPlayer(player: Player) {
        for (const [id, statistic] of this.teamAPlayerStatistics) {
            const stat: any = statistic.getStatisticUpdate();
            stat.id = id;
            player.sendStatisticsUpdate(stat);
        }
        for (const [id, statistic] of this.teamBPlayerStatistics) {
            const stat: any = statistic.getStatisticUpdate();
            stat.id = id;
            player.sendStatisticsUpdate(stat);
        }
    }

    public addLatePlayer(player: Player, team: Team) {
        if (team === Team.A) {
            this.teamAPlayerStatistics.set(player.id, new PlayerStatistic());
        } else if (team === Team.B) {
            this.teamBPlayerStatistics.set(player.id, new PlayerStatistic());
        } else {
            throw new Error("Unrecognized team");
        }
    }

    public getWinningTeam() {
        const teamAPoints = this.teamAHits + this.teamAKills * 2;
        const teamBPoints = this.teamBHits + this.teamBKills * 2;

        if (teamAPoints > teamBPoints) {
            return Team.A;
        } else if (teamBPoints > teamAPoints) {
            return Team.B;
        } else {
            return undefined;
        }
    }

    private onSend(data: any) {
        if (data.match === this.match) {

            const winningTeam = this.getWinningTeam();
            for (const player of PlayerHandler.getMatchPlayers(this.match)) {
                if (this.match.getTeam(player) === winningTeam) {
                    player.sendAudioRequest(Audio.WIN);
                } else {
                    player.sendAudioRequest(Audio.LOSE);
                }
            }

            const databaseStats: Map<string, any> = new Map();

            for (const [id, stat] of this.teamAPlayerStatistics) {
                const stats = stat.getStatistics(!(winningTeam === Team.B), this.teamAShots, this.teamAHits, this.teamAKills, this.teamBShots, this.teamBHits, this.teamBKills);
                const player = this.sendStatsToPlayer(id, stats);
                this.updateDatabaseStats(player, stats, databaseStats);
            }

            for (const [id, stat] of this.teamBPlayerStatistics) {
                const stats = stat.getStatistics(!(winningTeam === Team.A), this.teamBShots, this.teamBHits, this.teamBKills, this.teamAShots, this.teamAHits, this.teamAKills);
                const player = this.sendStatsToPlayer(id, stats);
                this.updateDatabaseStats(player, stats, databaseStats);
            }

            EventHandler.callEvent(EventHandler.Event.DB_PLAYERS_UPDATE, databaseStats);
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
                throw new Error("No stats registered for shot");
            }
        }
    }

    private onHit(data: any) {
        if (data.match === this.match) {
            let statUpdate;
            if (this.teamAPlayerStatistics.has(data.player)) {
                statUpdate = (this.teamAPlayerStatistics.get(data.player) as PlayerStatistic).incrementHits();

                this.teamAHits ++;
            } else if (this.teamBPlayerStatistics.has(data.player)) {
                statUpdate = (this.teamBPlayerStatistics.get(data.player) as PlayerStatistic).incrementHits();

                this.teamBHits ++;
            } else {
                throw new Error("No stats registered for hit");
            }
            this.sendStatUpdate(statUpdate, data.player);
        }
    }

    private onKill(data: any) {
        // shooter is not guaranteed.
        if (data.match === this.match) {
            let killStatUpdate;
            let deathStatUpdate;
            if (this.teamAPlayerStatistics.has(data.player)) {
                deathStatUpdate = (this.teamAPlayerStatistics.get(data.player) as PlayerStatistic).incrementDeaths();

                if (this.teamBPlayerStatistics.has(data.shooter)) {
                    killStatUpdate = (this.teamBPlayerStatistics.get(data.shooter) as PlayerStatistic).incrementKills();

                    this.teamBKills ++;
                }
            } else if (this.teamBPlayerStatistics.has(data.player)) {
                deathStatUpdate = (this.teamBPlayerStatistics.get(data.player) as PlayerStatistic).incrementDeaths();

                if (this.teamAPlayerStatistics.has(data.shooter)) {
                    killStatUpdate = (this.teamAPlayerStatistics.get(data.shooter) as PlayerStatistic).incrementKills();

                    this.teamAKills ++;
                }
            } else {
                throw new Error("No stats registered for death");
            }
            this.sendStatUpdate(deathStatUpdate, data.player);
            if (killStatUpdate) {
                this.sendStatUpdate(killStatUpdate, data.shooter);
            }
        }
    }

    private sendStatsToPlayer(id: number, stats: number[]) {
        const player = PlayerHandler.getMatchPlayer(this.match, id);
        player.sendMatchStatistics(stats);
        return player;
    }

    private sendStatUpdate(stat: any, playerId: number) {
        stat.id = playerId;
        const players = PlayerHandler.getMatchPlayers(this.match);
        for (const player of players) {
            player.sendStatisticsUpdate(stat);
        }
    }

    private updateDatabaseStats(player: Player, stats: number[], databaseStats: Map<string, any>) {
        if (player.sub) {

            const data = {
                victories: stats[12] ? 1 : 0,
                defeats: stats[12] ? 0 : 1,
                shots: stats[6],
                hits: stats[7],
                kills: stats[8],
                deaths: stats[9],
                points: stats[10],
                currency: stats[11],
            };

            databaseStats.set(player.sub, data);
        }
    }

    private updateDatbaseStat(player: Player, stats: number[]) {
        if (player.sub) {
            const data = {
                victories: 0,
                defeats: 0,
                shots: stats[0],
                hits: stats[1],
                kills: stats[2],
                deaths: stats[3],
                points: stats[4],
                currency: stats[5],
            };
            EventHandler.callEvent(EventHandler.Event.DB_PLAYER_UPDATE, {
                id: player.sub,
                data,
            });
        }
    }

}
