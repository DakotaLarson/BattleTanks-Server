"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vector3_1 = require("./Vector3");
class Arena {
    constructor(data) {
        this.rawData = data;
        this.initialSpawns = new Array();
        this.gameSpawns = new Array();
        this.blockPositions = new Array();
        this.title = data.title;
        this.nextGameSpawnIndex = 0;
        for (let i = 0; i < data.initialSpawnLocations.length; i += 3) {
            let x = data.initialSpawnLocations[i];
            let y = data.initialSpawnLocations[i + 1];
            let z = data.initialSpawnLocations[i + 2];
            this.initialSpawns.push(new Vector3_1.default(x, y, z));
        }
        for (let i = 0; i < data.gameSpawnLocations.length; i += 3) {
            let x = data.gameSpawnLocations[i];
            let y = data.gameSpawnLocations[i + 1];
            let z = data.gameSpawnLocations[i + 2];
            this.gameSpawns.push(new Vector3_1.default(x, y, z));
        }
        for (let i = 0; i < data.blockLocations.length; i += 3) {
            let x = data.blockLocations[i];
            let y = data.blockLocations[i + 1];
            let z = data.blockLocations[i + 2];
            this.blockPositions.push(new Vector3_1.default(x, y, z));
        }
    }
    getRandomInitialSpawn() {
        let length = this.initialSpawns.length;
        if (length) {
            return this.initialSpawns[Math.floor(Math.random() * length)];
        }
        else {
            return undefined;
        }
    }
    getNextGameSpawn() {
        let length = this.gameSpawns.length;
        if (length) {
            if (this.nextGameSpawnIndex >= this.gameSpawns.length) {
                this.nextGameSpawnIndex = 0;
            }
            return this.gameSpawns[this.nextGameSpawnIndex++];
        }
        else {
            return undefined;
        }
    }
    getRawData() {
        return this.rawData;
    }
}
exports.default = Arena;
//# sourceMappingURL=Arena.js.map