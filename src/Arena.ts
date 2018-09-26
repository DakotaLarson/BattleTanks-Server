import Vector3 from "./vector/Vector3";
import Vector4 from "./vector/Vector4";

export default class Arena {
    public initialSpawns: Vector4[];
    public gameSpawns: Vector4[];
    public blockPositions: Vector3[];

    public title: string;

    public rawData: any;

    private nextGameSpawnIndex: number;

    constructor(data: any) {
        this.rawData = data;

        this.initialSpawns = new Array();
        this.gameSpawns = new Array();
        this.blockPositions = new Array();

        this.title = data.title;

        this.nextGameSpawnIndex = 0;

        for (let i = 0; i < data.initialSpawnPositions.length; i += 4) {
            const x = data.initialSpawnPositions[i];
            const y = data.initialSpawnPositions[i + 1];
            const z = data.initialSpawnPositions[i + 2];
            const w = data.initialSpawnPositions[i + 3];
            this.initialSpawns.push(new Vector4(x, y, z, w));
        }

        for (let i = 0; i < data.gameSpawnPositions.length; i += 4) {
            const x = data.gameSpawnPositions[i];
            const y = data.gameSpawnPositions[i + 1];
            const z = data.gameSpawnPositions[i + 2];
            const w = data.gameSpawnPositions[i + 3];
            this.gameSpawns.push(new Vector4(x, y, z, w));
        }

        for (let i = 0; i < data.blockPositions.length; i += 3) {
            const x = data.blockPositions[i];
            const y = data.blockPositions[i + 1];
            const z = data.blockPositions[i + 2];
            this.blockPositions.push(new Vector3(x, y, z));
        }
    }

    public getRandomInitialSpawn(): Vector4 {
        const length = this.initialSpawns.length;
        if (length) {
            return this.initialSpawns[Math.floor(Math.random() * length)];
        } else {
            return new Vector4();
        }
    }

    public getNextGameSpawn(): Vector4 {
        const length = this.gameSpawns.length;
        if (length) {
            if (this.nextGameSpawnIndex >= this.gameSpawns.length) {
                this.nextGameSpawnIndex = 0;
            }
            return this.gameSpawns[this.nextGameSpawnIndex ++];
        } else {
            return new Vector4();
        }
    }
    public getRawData(): string {
        return this.rawData;
    }
}
