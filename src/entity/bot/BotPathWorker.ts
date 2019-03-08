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
    const path = finder.findPath(Math.floor(from.x), Math.floor(from.z), Math.floor(to.x), Math.floor(to.z), grid);
    for (const entry of path) {
        for (let i = 0; i < entry.length; i ++) {
            entry[i] += 0.5;
        }
    }
    if (path.length > 1) {
        const origXDiff = path[1][0] - path[0][0];
        const origZDiff = path[1][1] - path[0][1];
        const originalDistace = Math.pow(origXDiff, 2) + Math.pow(origZDiff, 2);

        const actualXDiff = path[1][0] - from.x;
        const actualZDiff = path[1][1] - from.z;
        const actualDistance = Math.pow(actualXDiff, 2) + Math.pow(actualZDiff, 2);
        if (actualDistance < originalDistace) {
            path[0][0] = from.x;
            path[0][1] = from.z;
        } else {
            path.unshift([from.x, from.z]);
        }
    }

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
