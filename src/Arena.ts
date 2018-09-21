import Vector3 from './Vector3';

export default class Arena{
    initialSpawns: Array<Vector3>;
    gameSpawns: Array<Vector3>;
    blockPositions: Array<Vector3>;

    title: string;

    rawData: any;

    private nextGameSpawnIndex: number;

    constructor(data){
        this.rawData = data;

        this.initialSpawns = new Array();
        this.gameSpawns = new Array();
        this.blockPositions = new Array();

        this.title = data.title;

        this.nextGameSpawnIndex = 0;

        for(let i = 0; i < data.initialSpawnLocations.length; i += 3){
            let x = data.initialSpawnLocations[i];
            let y = data.initialSpawnLocations[i + 1];
            let z = data.initialSpawnLocations[i + 2];
            this.initialSpawns.push(new Vector3(x, y, z));
        }
        
        for(let i = 0; i < data.gameSpawnLocations.length; i += 3){
            let x = data.gameSpawnLocations[i];
            let y = data.gameSpawnLocations[i + 1];
            let z = data.gameSpawnLocations[i + 2];
            this.gameSpawns.push(new Vector3(x, y, z));
        }

        for(let i = 0; i < data.blockLocations.length; i += 3){
            let x = data.blockLocations[i];
            let y = data.blockLocations[i + 1];
            let z = data.blockLocations[i + 2];
            this.blockPositions.push(new Vector3(x, y, z));
        }
    }
    
    getRandomInitialSpawn(): Vector3{
        let length = this.initialSpawns.length;
        if(length){
            return this.initialSpawns[Math.floor(Math.random() * length)];
        }else{
            return undefined;
        }
    }

    getNextGameSpawn(): Vector3{
        let length = this.gameSpawns.length;
        if(length){
            if(this.nextGameSpawnIndex >= this.gameSpawns.length){
                this.nextGameSpawnIndex = 0;
            }
            return this.gameSpawns[this.nextGameSpawnIndex ++];
        }else{
            return undefined;
        }
    }
    getRawData(): string{
        return this.rawData;
    }
}
