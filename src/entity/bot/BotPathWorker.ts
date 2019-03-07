import {  parentPort, workerData } from "worker_threads";
import {Grid, ThetaStarFinder } from "../../pathfinding/PathFinding";
import Vector3 from "../../vector/Vector3";

const originalGrid = new Grid(workerData.width + 2, workerData.height + 2);
for (const pos of workerData.blockPositions) {
    originalGrid.setWalkableAt(pos.x, pos.z, false);
}
const getPath = (from: Vector3, to: Vector3) => {
    const grid = originalGrid.clone();
    const finder = new ThetaStarFinder({});
    const path = finder.findPath(Math.round(from.x), Math.round(from.z), Math.round(to.x), Math.round(to.z), grid);
    for (const entry of path) {
        for (let i = 0; i < entry.length; i ++) {
            entry[i] += 0.5;
        }
    }
    path.unshift([from.x, from.z]);
    return path;
};

if (parentPort) {
    parentPort.on("message", (value: any) => {
        const path = getPath(value.from, value.to);
        if (parentPort) {
            parentPort.postMessage({
                id: value.id,
                path,
            });
        }
    });
}
