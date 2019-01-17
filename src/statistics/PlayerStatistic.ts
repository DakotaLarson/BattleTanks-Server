export default class PlayerStatistic {

    private shots: number;
    private hits: number;
    private kills: number;
    private deaths: number;

    constructor() {

        this.shots = 0;
        this.hits = 0;
        this.kills = 0;
        this.deaths = 0;
    }

    public incrementShots() {
        this.shots ++;
    }

    public incrementHits() {
        this.hits ++;
    }

    public incrementKills() {
        this.kills ++;
    }

    public incrementDeaths() {
        this.deaths ++;
    }

    public getStatistics(win: boolean, teamShots: number, teamHits: number, teamKills: number, enemyTeamShots: number, enemyTeamHits: number, enemyTeamKills: number) {
        const winData = win ? 1 : 0;

        return [winData, teamShots, teamHits, teamKills, enemyTeamShots, enemyTeamHits, enemyTeamKills, this.shots, this.hits, this.kills, this.deaths];
    }
}
