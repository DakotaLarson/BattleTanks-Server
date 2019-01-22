import { BestFirstFinder, DiagonalMovement, Grid } from "pathfinding";
import Arena from "../../Arena";
import Vector3 from "../../vector/Vector3";

export default class BotPathHandler {

    private grid: Grid;

    constructor(arena: Arena) {
        this.grid = new Grid(arena.width + 2, arena.height + 2);
        for (const pos of arena.blockPositions) {
            this.grid.setWalkableAt(pos.x, pos.z, false);
        }
    }

    public getPath(from: Vector3, to: Vector3) {
        const grid = this.grid.clone();
        const finder = new BestFirstFinder({
            diagonalMovement: DiagonalMovement.OnlyWhenNoObstacle,
        });
        return finder.findPath(Math.round(from.x), Math.round(from.z), Math.round(to.x), Math.round(to.z), grid);
    }
}
