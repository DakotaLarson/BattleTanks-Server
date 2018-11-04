import Vector3 from "./vector/Vector3";
import Vector4 from "./vector/Vector4";

export default class Arena {

    public blockPositions: Vector3[];

    public title: string;

    public minimumPlayerCount: number;
    public maximumPlayerCount: number;

    private rawData: any;

    private initialSpawns: Vector4[];
    private gameSpawns: Vector4[];
    private teamASpawns: Vector4[];
    private teamBSpawns: Vector4[];

    private nextGameSpawnIndex: number;
    private nextInitialSpawnIndex: number;
    private nextTeamASpawnIndex: number;
    private nextTeamBSpawnIndex: number;

    constructor(data: any) {
        this.rawData = data;

        this.initialSpawns = [];
        this.gameSpawns = [];
        this.teamASpawns = [];
        this.teamBSpawns = [];
        this.blockPositions = [];

        this.title = data.title;

        this.nextGameSpawnIndex = 0;
        this.nextInitialSpawnIndex = 0;
        this.nextTeamASpawnIndex = 0;
        this.nextTeamBSpawnIndex = 0;

        this.minimumPlayerCount = 2;
        this.maximumPlayerCount = 16;

        for (let i = 0; i < data.initialSpawnPositions.length; i += 4) {
            const x = data.initialSpawnPositions[i];
            const y = data.initialSpawnPositions[i + 1];
            const z = data.initialSpawnPositions[i + 2];
            const w = data.initialSpawnPositions[i + 3] + Math.PI / 2;
            this.initialSpawns.push(new Vector4(x, y, z, w));
        }

        for (let i = 0; i < data.gameSpawnPositions.length; i += 4) {
            const x = data.gameSpawnPositions[i];
            const y = data.gameSpawnPositions[i + 1];
            const z = data.gameSpawnPositions[i + 2];
            const w = data.gameSpawnPositions[i + 3] + Math.PI / 2;
            this.gameSpawns.push(new Vector4(x, y, z, w));
        }

        for (let i = 0; i < data.teamASpawnPositions.length; i += 4) {
            const x = data.teamASpawnPositions[i];
            const y = data.teamASpawnPositions[i + 1];
            const z = data.teamASpawnPositions[i + 2];
            const w = -data.teamASpawnPositions[i + 3] + Math.PI / 2;
            this.teamASpawns.push(new Vector4(x, y, z, w));
        }

        for (let i = 0; i < data.teamBSpawnPositions.length; i += 4) {
            const x = data.teamBSpawnPositions[i];
            const y = data.teamBSpawnPositions[i + 1];
            const z = data.teamBSpawnPositions[i + 2];
            const w = -data.teamBSpawnPositions[i + 3] + Math.PI / 2;
            this.teamBSpawns.push(new Vector4(x, y, z, w));
        }

        for (let i = 0; i < data.blockPositions.length; i += 3) {
            const x = data.blockPositions[i];
            const y = data.blockPositions[i + 1];
            const z = data.blockPositions[i + 2];
            this.blockPositions.push(new Vector3(x, y, z));
        }
    }

    public getNextInitialSpawn(): Vector4 {
        const length = this.initialSpawns.length;
        if (length) {
            if (this.nextInitialSpawnIndex >= length) {
                this.nextInitialSpawnIndex = 0;
            }
            return this.initialSpawns[this.nextInitialSpawnIndex ++];
        } else {
            return new Vector4();
        }
    }

    public getNextGameSpawn(): Vector4 {
        const length = this.gameSpawns.length;
        if (length) {
            if (this.nextGameSpawnIndex >= length) {
                this.nextGameSpawnIndex = 0;
            }
            return this.gameSpawns[this.nextGameSpawnIndex ++];
        } else {
            return new Vector4();
        }
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
}
