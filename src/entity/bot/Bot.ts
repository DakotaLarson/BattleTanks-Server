import Lobby from "../../core/Lobby";
import EventHandler from "../../EventHandler";
import Vector3 from "../../vector/Vector3";
import Vector4 from "../../vector/Vector4";
import Player from "../Player";
import BotHandler from "./BotHandler";

export default class Bot extends Player {

    private static readonly SHORT_THINK_TIME = 500;
    private static readonly LONG_THINK_TIME = 2000;

    private static readonly SPEED = 5;
    private static readonly SHOOT_CHANCE = 0.15;

    private lobby: Lobby;
    private botHandler: BotHandler;

    private path: number[][] | undefined;
    private visibleEnemy: Player | undefined;
    private currentPathIndex: number;
    private movingToNextPathIndex: boolean;

    private timeouts: NodeJS.Timeout[];
    private pathTimeout: NodeJS.Timeout | undefined;

    constructor(id: number, lobby: Lobby, botHandler: BotHandler) {
        super("Guest", id);
        this.lobby = lobby;
        this.botHandler = botHandler;

        this.currentPathIndex = 0;
        this.movingToNextPathIndex = false;

        this.timeouts = [];
    }

    public enable() {
        EventHandler.addListener(this, EventHandler.Event.GAME_TICK, this.onTick);
        EventHandler.addListener(this, EventHandler.Event.BOTS_LOGIC_TICK, this.onLogicTick);
    }

    public disable() {
        EventHandler.removeListener(this, EventHandler.Event.GAME_TICK, this.onTick);
        for (const timeout of this.timeouts) {
            clearTimeout(timeout);
        }
        this.timeouts = [];
    }

    public isBot() {
        return true;
    }

    public think() {
        const time = this.getRandomTime();
        this.reset(true);

        const timeout = setTimeout(() => {
            this.makeDecision();
            this.completeTimeout(timeout);
        }, time);
        this.timeouts.push(timeout);
        return time;
    }

    public spawn(pos: Vector4) {
        super.spawn(pos);
        this.think();
    }

    public despawn(involvedId?: number, livesRemaining?: number) {
        super.despawn(involvedId, livesRemaining);
        this.reset(true);
    }

    protected onTick(delta: number) {
        super.onTick(delta);
        if (this.isAlive) {
            if (this.lookAtVisibleEnemy()) {
                this.attemptToShoot();
            } else {
                if (this.path) {
                    if (this.movingToNextPathIndex) {
                        const newPosition = this.movePositionAlongPath(this.position, this.bodyRot, delta);
                        if (this.botHandler.canMove(this.lobby, this, newPosition)) {
                            this.updatePosition(newPosition, this.bodyRot);
                        } else {
                            this.think();
                        }
                    } else {
                        const time = this.getNextTargetPosition();
                        if (time < 0) {
                            this.think();
                        } else {
                            this.movingToNextPathIndex = true;
                            if (this.pathTimeout) {
                                console.warn("Clearing previous pathtimeout");
                                clearTimeout(this.pathTimeout);
                            }
                            this.pathTimeout = setTimeout(() => {
                                if (this.movingToNextPathIndex) {
                                    this.movingToNextPathIndex = false;
                                    this.currentPathIndex ++;
                                }
                                if (this.pathTimeout) {
                                    this.completeTimeout(this.pathTimeout);
                                    this.pathTimeout = undefined;
                                }
                            }, time);
                            this.timeouts.push(this.pathTimeout);
                        }
                    }
                    EventHandler.callEvent(EventHandler.Event.PLAYER_MOVE, this);
                } else {
                    this.updateHeadRotation(this.bodyRot);
                }
            }
        }
    }

    private onLogicTick() {
        if (this.isAlive) {
            if (!this.visibleEnemy) {
                this.visibleEnemy = this.getClosestVisibleEnemy();
                if (this.visibleEnemy) {
                    this.targetEnemy();
                    this.reset(false);
                }
            }
        }
    }

    private movePositionAlongPath(position: Vector3, bodyRot: number, delta: number) {
        const newPosition = position.clone();
        newPosition.x += delta * Bot.SPEED * Math.sin(bodyRot),
        newPosition.z += delta * Bot.SPEED * Math.cos(bodyRot);
        return newPosition;
    }

    private getNextPathPosition(path: number[][], currentIndex: number) {
        return this.getPathPosition(path, currentIndex + 1);
    }

    private getTimeToNextPathPosition(from: Vector3, to: Vector3) {
        const distance = from.distance(to);
        return distance / Bot.SPEED * 1000;

    }

    private getPathPosition(path: number[][], index: number) {
        const pathPosition = path[index];
        return new Vector3(pathPosition[0], 0, pathPosition[1]);
    }

    private getAngleToPosition(from: Vector3, to: Vector3) {
        const xDiff = to.x - from.x;
        const zDiff = to.z - from.z;
        return Math.atan2(xDiff, zDiff);
    }

    private lookAtVisibleEnemy() {
        if (this.visibleEnemy && this.visibleEnemy.isAlive) {
            const xDiff = (this.visibleEnemy as Player).position.x - this.position.x;
            const zDiff = (this.visibleEnemy as Player).position.z - this.position.z;
            const angle = Math.atan2(xDiff, zDiff);
            this.updateHeadRotation(angle);
            return true;
        }
        return false;
    }

    private getNextTargetPosition() {
        if (this.path && this.currentPathIndex < this.path.length - 2) {
            const position  = this.getPathPosition(this.path, this.currentPathIndex);
            const targetPosition = this.getNextPathPosition(this.path, this.currentPathIndex);

            const angle = this.getAngleToPosition(position, targetPosition);
            const time = this.getTimeToNextPathPosition(position, targetPosition);
            this.updatePosition(position, angle);

            return time;
        } else {
            return -1;
        }
    }

    private makeDecision() {
        if (!this.path) {
            this.visibleEnemy = undefined;
            const selectedEnemy = this.getRandomEnemy();
            if (selectedEnemy) {
                this.botHandler.getPath(this.lobby, this.position, selectedEnemy.position).then((path) => {
                    this.path = path;
                });
                this.currentPathIndex = 0;
                this.movementVelocity = 0;
                this.movingToNextPathIndex = false;
            } else {
                this.think();
            }
        }
    }

    private targetEnemy() {
        const shootTime = this.getRandomTime();
        const timeout = setTimeout(() => {
            if (this.visibleEnemy && this.visibleEnemy.isAlive && this.visibleEnemy.position.distance(this.position) < 3) {
                this.targetEnemy();
            } else {
                this.think();
                this.completeTimeout(timeout);
            }
        }, shootTime);
        this.timeouts.push(timeout);
    }

    private attemptToShoot() {
        if (Math.random() < Bot.SHOOT_CHANCE) {
            this.shoot();
        }
    }

    private completeTimeout(timeout: NodeJS.Timeout) {
        if (this.timeouts.includes(timeout)) {
            this.timeouts.splice(this.timeouts.indexOf(timeout), 1);
        }
    }

    private updatePosition(position: Vector3, rot: number) {
        if (position.distanceSquared(this.position) > 1) {
            console.warn("long update distance");
        }
        this.bodyRot = rot;
        this.headRot = rot;
        this.position = position;
        this.movementVelocity = Bot.SPEED;

        EventHandler.callEvent(EventHandler.Event.PLAYER_MOVE, this);
    }

    private updateHeadRotation(rot: number) {
        this.headRot = rot;
        this.movementVelocity = 0;
        EventHandler.callEvent(EventHandler.Event.PLAYER_MOVE, this);
    }

    private getClosestVisibleEnemy() {
        const enemies = this.lobby.getEnemies(this);
        const visibleEnemies = [];

        for (const enemy of enemies) {
            if (enemy.isAlive && this.botHandler.hasLineOfSight(this.lobby, this.position, enemy.position, enemy.bodyRot)) {
                visibleEnemies.push(enemy);
            }
        }

        if (visibleEnemies.length) {
            let selectedEnemy = visibleEnemies[0];
            let selectedDistance = this.position.distanceSquared(selectedEnemy.position);
            for (let i = 1; i < visibleEnemies.length; i ++) {
                const distance = this.position.distanceSquared(visibleEnemies[i].position);
                if (distance < selectedDistance) {
                    selectedEnemy = visibleEnemies[i];
                    selectedDistance = distance;
                }
            }
            return selectedEnemy;
        }
        return undefined;
    }

    private getRandomTime() {
        return Math.random() * (Bot.LONG_THINK_TIME - Bot.SHORT_THINK_TIME) + Bot.SHORT_THINK_TIME;
    }

    private getRandomEnemy() {
        const enemies = this.lobby.getEnemies(this);
        if (enemies.length) {
            const index = Math.floor(Math.random() * enemies.length);
            return enemies[index];
        }
        return undefined;
    }

    private reset(updateVelocity: boolean) {
        this.path = undefined;
        this.movingToNextPathIndex = false;
        this.currentPathIndex = 0;
        if (updateVelocity) {
            this.movementVelocity = 0;
        }
        if (this.pathTimeout) {
            clearTimeout(this.pathTimeout);
            this.completeTimeout(this.pathTimeout);
            this.pathTimeout = undefined;
        }
    }
}
