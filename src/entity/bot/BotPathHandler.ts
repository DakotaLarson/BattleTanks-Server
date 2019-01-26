import Arena from "../../Arena";
import {Grid, ThetaStarFinder } from "../../pathfinding/PathFinding";
import Vector3 from "../../vector/Vector3";
import BotHitscanHandler from "./BotHitscanHandler";

export default class BotPathHandler {

    private grid: any;
    private hitscanHandler: BotHitscanHandler;

    constructor(arena: Arena) {
        this.grid = new Grid(arena.width + 2, arena.height + 2);
        for (const pos of arena.blockPositions) {
            this.grid.setWalkableAt(pos.x, pos.z, false);
        }
        this.hitscanHandler = new BotHitscanHandler(arena);
    }

    public getPath(from: Vector3, to: Vector3) {
        const grid = this.grid.clone();
        const finder = new ThetaStarFinder({});
        return finder.findPath(Math.round(from.x), Math.round(from.z), Math.round(to.x), Math.round(to.z), grid);
    }

    public hasLineOfSight(from: Vector3, to: Vector3, targetRot: number) {
        const fromPos = from.clone().add(new Vector3(0.5, 0, 0.5));
        const toPos = to.clone().add(new Vector3(0.5, 0, 0.5));
        // if (this.hasBresenhamsLine(fromPos, toPos)) {
        return this.hitscanHandler.hasLineOfSight(fromPos, toPos, targetRot);
        // }
        // return false;
    }

    // private hasBresenhamsLine(from: Vector3, to: Vector3) {
    //     let sx;
    //     let sy;
    //     let f;
    //     let s0;
    //     let s1;
    //     let x0 = Math.floor(from.x);
    //     let y0 = Math.floor(from.z);
    //     let x1 = Math.floor(to.x);
    //     let y1 = Math.floor(to.z);
    //     let dx = x1 - x0;
    //     let dy = y1 - y0;
    //     if (dx < 0) {
    //     dx = -dx;
    //     sx = -1;
    // } else {
    //     sx = 1;
    // }
    //     if (dy < 0) {
    //     dy = -dy;
    //     sy = -1;
    // } else {
    //     sy = 1;
    // }
    //     if (dx === 0) {
    //     for (y0 += sy; y0 !== y1; y0 += sy) {
    //         if (!this.grid.isWalkableAt(x0, y0)) {
    //             return false;
    //         }
    //     }
    //     return true;
    // }
    //     if (dy === 0) {
    //     for (x0 += sx; x0 !== x1; x0 += sx) {
    //         if (!this.grid.isWalkableAt(x0, y0)) {
    //             return false;
    //         }
    //     }
    //     return true;
    // }
    //     if (dx >= dy) {
    //     if (!this.grid.isWalkableAt(x0, y0 + sy) || !this.grid.isWalkableAt(x1, y1 - sy)) {
    //         return false;
    //     }
    //     for (s0 = y0, s1 = y1, f = dy; ;) {
    //         f += dy;
    //         if (f >= dx) {
    //             x0 += sx;
    //             y0 += sy;
    //             x1 -= sx;
    //             y1 -= sy;
    //             f -= dx;
    //         } else {
    //             x0 += sx;
    //             x1 -= sx;
    //         }
    //         if (x0 === x1 + sx) {
    //             break;
    //         }
    //         if (x0 === x1) {
    //             if (y0 === y1) {
    //                 if (!this.grid.isWalkableAt(x0, y0 - sy) || !this.grid.isWalkableAt(x0, y0) || !this.grid.isWalkableAt(x0, y0 + sy)) {
    //                     return false;
    //                 }
    //             } else {
    //                 if (!this.grid.isWalkableAt(x0, y0) || !this.grid.isWalkableAt(x1, y1)) {
    //                     return false;
    //                 }
    //             }
    //             break;
    //         }
    //         if (y0 !== s0 && !this.grid.isWalkableAt(x0, y0 - sy)) {
    //             return false;
    //         }
    //         if (!this.grid.isWalkableAt(x0, y0) || !this.grid.isWalkableAt(x0, y0 + sy)) {
    //             return false;
    //         }
    //         if (y1 !== s1 && !this.grid.isWalkableAt(x1, y1 + sy)) {
    //             return false;
    //         }
    //         if (!this.grid.isWalkableAt(x1, y1) || !this.grid.isWalkableAt(x1, y1 - sy)) {
    //             return false;
    //         }
    //     }
    // } else {
    //     if (!this.grid.isWalkableAt(x0 + sx, y0) || !this.grid.isWalkableAt(x1 - sx, y1)) {
    //         return false;
    //     }
    //     for (s0 = x0, s1 = x1, f = dx; ;) {
    //         f += dx;
    //         if (f >= dy) {
    //             x0 += sx;
    //             y0 += sy;
    //             x1 -= sx;
    //             y1 -= sy;
    //             f -= dy;
    //         } else {
    //             y0 += sy;
    //             y1 -= sy;
    //         }
    //         if (y0 === y1 + sy) {
    //             break;
    //         }
    //         if (y0 === y1) {
    //             if (x0 === x1) {
    //                 if (!this.grid.isWalkableAt(x0 - sx, y0) || !this.grid.isWalkableAt(x0, y0) || !this.grid.isWalkableAt(x0 + sx, y0)) {
    //                     return false;
    //                 }
    //             } else {
    //                 if (!this.grid.isWalkableAt(x0, y0) || !this.grid.isWalkableAt(x1, y1)) {
    //                     return false;
    //                 }
    //             }
    //             break;
    //         }
    //         if (x0 !== s0 && !this.grid.isWalkableAt(x0 - sx, y0)) {
    //             return false;
    //         }
    //         if (!this.grid.isWalkableAt(x0, y0) || !this.grid.isWalkableAt(x0 + sx, y0)) {
    //             return false;
    //         }
    //         if (x1 !== s1 && !this.grid.isWalkableAt(x1 + sx, y1)) {
    //             return false;
    //         }
    //         if (!this.grid.isWalkableAt(x1, y1) || !this.grid.isWalkableAt(x1 - sx, y1)) {
    //             return false;
    //         }
    //     }
    // }
    //     return true;
    // }
}
