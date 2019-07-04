export default class PlayerStatistic {

    private static readonly CURRENCY_DIVISOR = 10;

    private shots: number;
    private hits: number;
    private kills: number;
    private deaths: number;

    private points: number;
    private currency: number;

    constructor() {

        this.shots = 0;
        this.hits = 0;
        this.kills = 0;
        this.deaths = 0;

        this.points = 0;
        this.currency = 0;
    }

    public incrementShots() {
        this.shots ++;
    }

    public incrementHits() {
        this.hits ++;

        this.points ++;
        this.currency = this.calcuateCurrency(this.points); ;

        return {
            points: this.points,
        };
    }

    public incrementKills() {
        this.kills ++;

        this.points += 2;
        this.currency = this.calcuateCurrency(this.points);

        return {
            kills: this.kills,
            points: this.points,
        };
    }

    public incrementDeaths() {
        this.deaths ++;

        return {
            deaths: this.deaths,
        };
    }

    public getStatistics(win: boolean, teamShots: number, teamHits: number, teamKills: number, enemyTeamShots: number, enemyTeamHits: number, enemyTeamKills: number, successfulCompletion: boolean) {

        const winData = win ? 1 : 0;
        const stats = [teamShots, teamHits, teamKills, enemyTeamShots, enemyTeamHits, enemyTeamKills, this.shots, this.hits, this.kills, this.deaths, this.points, this.currency];

        if (successfulCompletion) {
            stats.push(winData);
        }

        return stats;
    }

    public getEarlyStatistic() {
        return [this.shots, this.hits, this.kills, this.deaths, this.points, this.currency];
    }

    public getStatisticUpdate() {
        return {
            points: this.points,
            kills: this.kills,
            deaths: this.deaths,
        };
    }

    private calcuateCurrency(points: number) {
        return Math.floor(points / PlayerStatistic.CURRENCY_DIVISOR);
    }
}
