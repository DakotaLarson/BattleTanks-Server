export default class PlayerStatistic {

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
        this.currency ++;
    }

    public incrementKills() {
        this.kills ++;

        this.points += 2;
        this.currency += 2;
    }

    public incrementDeaths() {
        this.deaths ++;
    }

    public getStatistics(win: boolean, teamShots: number, teamHits: number, teamKills: number, enemyTeamShots: number, enemyTeamHits: number, enemyTeamKills: number) {
        const winData = win ? 1 : 0;

        return [winData, teamShots, teamHits, teamKills, enemyTeamShots, enemyTeamHits, enemyTeamKills, this.shots, this.hits, this.kills, this.deaths, this.points, this.currency];
    }
}
