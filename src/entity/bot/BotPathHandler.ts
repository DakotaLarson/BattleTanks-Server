import * as path from "path";
import * as WorkerThreads from "worker_threads";
import Arena from "../../arena/Arena";
import Lobby from "../../core/Lobby";
import {Grid} from "../../pathfinding/PathFinding";
import Vector3 from "../../vector/Vector3";
import Player from "../Player";
import PlayerHandler from "../PlayerHandler";
import Bot from "./Bot";
import BotHandler from "./BotHandler";
import BotHitscanHandler from "./BotHitscanHandler";

export default class BotPathHandler {

    private static readonly PLAYER_SQUARE_RADIUS = Math.pow(1.5, 2);

    private grid: any;
    private hitscanHandler: BotHitscanHandler;
    private botHandler: BotHandler;
    private lobby: Lobby;

    private worker: WorkerThreads.Worker;
    private workerCallbacks: Map<number, any>;
    private pathId: number;

    constructor(arena: Arena, botHandler: BotHandler, lobby: Lobby) {
        this.grid = new Grid(arena.width + 2, arena.height + 2);
        for (const pos of arena.blockPositions) {
            this.grid.setWalkableAt(pos.x, pos.z, false);
        }
        this.hitscanHandler = new BotHitscanHandler(arena);
        this.botHandler = botHandler;
        this.lobby = lobby;

        this.worker = new WorkerThreads.Worker(path.join(__dirname, "BotPathWorker.js"), {
            workerData: arena,
        });
        this.worker.on("message", (value: any) => {
            const callback = this.workerCallbacks.get(value.id);
            if (callback) {
                callback(value.path);
                this.workerCallbacks.delete(value.id);
            } else {
                console.warn("No callback for worker result");
            }
        });
        this.worker.on("error", console.log);

        this.workerCallbacks = new Map();
        this.pathId = 0;
    }

    public disable() {
        this.worker.terminate();
    }

    public getPath(from: Vector3, to: Vector3): Promise<number[][]> {
        return new Promise((resolve) => {
            const id = this.pathId ++;
            this.worker.postMessage({
                id,
                to,
                from,
            });
            this.workerCallbacks.set(id, resolve);
        });
    }

    public hasLineOfSight(from: Vector3, to: Vector3, targetRot: number) {
        const fromPos = from.clone();
        const toPos = to.clone();
        if (this.hasBresenhamsLine(fromPos, toPos)) {
            return this.hitscanHandler.hasLineOfSight(fromPos, toPos, targetRot);
        }
        return false;
    }

    public canMove(bot: Bot, to: Vector3) {
        for (const player of this.botHandler.getBots(this.lobby)) {
            if (this.isPlayerClose(bot, player, to)) {
                return false;
            }
        }

        for (const player of PlayerHandler.getLobbyPlayers(this.lobby)) {
            if (this.isPlayerClose(bot, player, to)) {
                return false;
            }
        }
        return true;
    }

    private isPlayerClose(bot: Bot, player: Player, to: Vector3) {
        if (player !== bot && player.isAlive) {
            const nextDistance = player.position.distanceSquared(to);
            if (nextDistance <= BotPathHandler.PLAYER_SQUARE_RADIUS) {
                const currentDistance = player.position.distanceSquared(bot.position);
                if (nextDistance < currentDistance) {
                    return true;
                }
            }
        }
        return false;
    }

    private hasBresenhamsLine(from: Vector3, to: Vector3) {
        let sx;
        let sy;
        let f;
        let s0;
        let s1;
        let x0 = Math.floor(from.x);
        let y0 = Math.floor(from.z);
        let x1 = Math.floor(to.x);
        let y1 = Math.floor(to.z);
        let dx = x1 - x0;
        let dy = y1 - y0;

        if (dx < 0) {
            dx = -dx;
            sx = -1;
        } else {
            sx = 1;
        }
        if (dy < 0) {
            dy = -dy;
            sy = -1;
        } else {
            sy = 1;
        }
        if (dx === 0) {
            for (y0 += sy; y0 !== y1; y0 += sy) {
                if (!this.grid.isWalkableAt(x0, y0)) {
                    return false;
                }
            }
            return true;
        }
        if (dy === 0) {
            for (x0 += sx; x0 !== x1; x0 += sx) {
                if (!this.grid.isWalkableAt(x0, y0)) {
                    return false;
                }
            }
            return true;
        }
        if (dx >= dy) {
            if (!this.grid.isWalkableAt(x0, y0 + sy) || !this.grid.isWalkableAt(x1, y1 - sy)) {
                return false;
            }
            for (s0 = y0, s1 = y1, f = dy; ;) {
                f += dy;
                if (f >= dx) {
                    x0 += sx;
                    y0 += sy;
                    x1 -= sx;
                    y1 -= sy;
                    f -= dx;
                } else {
                    x0 += sx;
                    x1 -= sx;
                }
                if (x0 === x1 + sx) {
                    break;
                }
                if (x0 === x1) {
                    if (y0 === y1) {
                        if (!this.grid.isWalkableAt(x0, y0 - sy) || !this.grid.isWalkableAt(x0, y0) || !this.grid.isWalkableAt(x0, y0 + sy)) {
                            return false;
                        }
                    } else {
                        if (!this.grid.isWalkableAt(x0, y0) || !this.grid.isWalkableAt(x1, y1)) {
                            return false;
                        }
                    }
                    break;
                }
                if (y0 !== s0 && !this.grid.isWalkableAt(x0, y0 - sy)) {
                    return false;
                }
                if (!this.grid.isWalkableAt(x0, y0) || !this.grid.isWalkableAt(x0, y0 + sy)) {
                    return false;
                }
                if (y1 !== s1 && !this.grid.isWalkableAt(x1, y1 + sy)) {
                    return false;
                }
                if (!this.grid.isWalkableAt(x1, y1) || !this.grid.isWalkableAt(x1, y1 - sy)) {
                    return false;
                }
            }
        } else {
            if (!this.grid.isWalkableAt(x0 + sx, y0) || !this.grid.isWalkableAt(x1 - sx, y1)) {
                return false;
            }
            for (s0 = x0, s1 = x1, f = dx; ;) {
                f += dx;
                if (f >= dy) {
                    x0 += sx;
                    y0 += sy;
                    x1 -= sx;
                    y1 -= sy;
                    f -= dy;
                } else {
                    y0 += sy;
                    y1 -= sy;
                }
                if (y0 === y1 + sy) {
                    break;
                }
                if (y0 === y1) {
                    if (x0 === x1) {
                        if (!this.grid.isWalkableAt(x0 - sx, y0) || !this.grid.isWalkableAt(x0, y0) || !this.grid.isWalkableAt(x0 + sx, y0)) {
                            return false;
                        }
                    } else {
                        if (!this.grid.isWalkableAt(x0, y0) || !this.grid.isWalkableAt(x1, y1)) {
                            return false;
                        }
                    }
                    break;
                }
                if (x0 !== s0 && !this.grid.isWalkableAt(x0 - sx, y0)) {
                    return false;
                }
                if (!this.grid.isWalkableAt(x0, y0) || !this.grid.isWalkableAt(x0 + sx, y0)) {
                    return false;
                }
                if (x1 !== s1 && !this.grid.isWalkableAt(x1 + sx, y1)) {
                    return false;
                }
                if (!this.grid.isWalkableAt(x1, y1) || !this.grid.isWalkableAt(x1 - sx, y1)) {
                    return false;
                }
            }
        }
        return true;
    }
}
