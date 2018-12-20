import Vector3 from "./vector/Vector3";
import Vector4 from "./vector/Vector4";

export default class Arena {

    public static maximumPlayerCount: number;
    public static minimumPlayerCount: number;

    public title: string;

    public blockPositions: Vector3[];

    public shieldPowerupPositions: Vector3[];
    public healthPowerupPositions: Vector3[];
    public speedPowerupPositions: Vector3[];
    public ammoPowerupPositions: Vector3[];

    public minimumPlayerCount: number;
    public maximumPlayerCount: number;

    private rawData: any;

    private teamASpawns: Vector4[];
    private teamBSpawns: Vector4[];

    private nextTeamASpawnIndex: number;
    private nextTeamBSpawnIndex: number;

    constructor(data: any) {
        this.rawData = data;

        this.title = data.title;
        this.blockPositions = [];

        this.teamASpawns = [];
        this.teamBSpawns = [];

        this.shieldPowerupPositions = [];
        this.healthPowerupPositions = [];
        this.speedPowerupPositions = [];
        this.ammoPowerupPositions = [];

        this.nextTeamASpawnIndex = 0;
        this.nextTeamBSpawnIndex = 0;

        this.minimumPlayerCount = data.minimumPlayerCount;
        Arena.minimumPlayerCount = Math.min(this.minimumPlayerCount, Arena.minimumPlayerCount);

        this.maximumPlayerCount = data.maximumPlayerCount;
        Arena.maximumPlayerCount = Math.max(this.maximumPlayerCount, Arena.maximumPlayerCount);

        this.parseLocationData(data, "blockPositions", this.blockPositions, false);

        this.parseLocationData(data, "teamASpawnPositions", this.teamASpawns, true);
        this.parseLocationData(data, "teamBSpawnPositions", this.teamBSpawns, true);

        this.parseLocationData(data, "shieldPowerupPositions", this.shieldPowerupPositions, false);
        this.parseLocationData(data, "healthPowerupPositions", this.healthPowerupPositions, false);
        this.parseLocationData(data, "speedPowerupPositions", this.speedPowerupPositions, false);
        this.parseLocationData(data, "ammoPowerupPositions", this.ammoPowerupPositions, false);
    }

    public getNextTeamASpawn(): Vector4 {
        const length = this.teamASpawns.length;
        if (length) {
            if (this.nextTeamASpawnIndex >= length) {
                this.nextTeamASpawnIndex = 0;
            }
            return this.teamASpawns[this.nextTeamASpawnIndex ++];
        } else {
            return new Vector4();
        }
    }

    public getNextTeamBSpawn(): Vector4 {
        const length = this.teamBSpawns.length;
        if (length) {
            if (this.nextTeamBSpawnIndex >= length) {
                this.nextTeamBSpawnIndex = 0;
            }
            return this.teamBSpawns[this.nextTeamBSpawnIndex ++];
        } else {
            return new Vector4();
        }
    }

    public getRawData(): string {
        return this.rawData;
    }

    private parseLocationData(data: any, title: string, storage: Vector3[] | Vector4[], isVec4: boolean) {
        if (data[title]) {
            const length = data[title].length;
            if (length) {
                let increment = 3;
                if (isVec4) {
                    increment = 4;
                }
                for (let i = 0; i < length; i += increment) {
                    const x = data[title][i];
                    const y = data[title][i + 1];
                    const z = data[title][i + 2];
                    if (isVec4) {
                        const w = -data[title][i + 3] + Math.PI / 2;
                        (storage as Vector4[]).push(new Vector4(x, y, z, w));
                    } else {
                        (storage as Vector3[]).push(new Vector3(x, y, z));

                    }
                }
            }
        }
    }
}
