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

    public hasLineOfSight(from: Vector3, to: Vector3) {
        let x0 = Math.floor(from.x + 0.5);
        let y0 = Math.floor(from.z + 0.5);

        const x1 = Math.floor(to.x + 0.5);
        const y1 = Math.floor(to.z + 0.5);

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);

        const sx = (x0 < x1) ? 1 : -1;
        const sy = (y0 < y1) ? 1 : -1;

        let lastWalkable;

        let err = dx - dy;
        while (x0 !== x1 || y0 !== y1) {
            const gridX = Math.floor(x0);
            const gridY = Math.floor(y0);
            if (!this.grid.isWalkableAt(gridX, gridY)) {
                return false;
            } else {
                if (this.testDiagonal(gridX, gridY, lastWalkable)) {
                    lastWalkable = {
                        gridX,
                        gridY,
                    };
                } else {
                    return false;
                }
            }

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy; x0  += sx;
             }
            if (e2 < dx) {
                err += dx; y0  += sy;
            }
        }

        return true;
    }

    private testDiagonal(gridX: number, gridY: number, lastWalkable: any) {
        if (lastWalkable) {
            const minX = Math.min(gridX, lastWalkable.gridX);
            const minY = Math.min(gridY, lastWalkable.gridY);

            const maxX = Math.max(gridX, lastWalkable.gridX);
            const maxY = Math.max(gridY, lastWalkable.gridY);

            if (maxX - minX && maxY - minY) {
                return  this.grid.isWalkableAt(minX, maxY) || this.grid.isWalkableAt(maxX, minY);
            } else {
                return true;
            }

        } else {
            lastWalkable = {
                gridX,
                gridY,
            };
            return true;
        }
    }
}
