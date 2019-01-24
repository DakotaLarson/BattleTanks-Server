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
    private targetPlayer: Player | undefined;
    private targetPosition: Vector3;
    private currentPathIndex: number;
    private movingToNextPathIndex: boolean;
    private canTargetPlayer: boolean;

    private timeouts: NodeJS.Timeout[];

    constructor(id: number, lobby: Lobby, botHandler: BotHandler) {
        super("Bot#" + id, id);
        this.lobby = lobby;
        this.botHandler = botHandler;

        this.targetPosition = new Vector3();
        this.currentPathIndex = 0;
        this.movingToNextPathIndex = false;
        this.canTargetPlayer = false;

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
        this.path = undefined;
        this.movementVelocity = 0;

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
        this.path = undefined;
        this.movingToNextPathIndex = false;
        this.movementVelocity = 0;
    }

    protected onTick(delta: number) {
        super.onTick(delta);
        if (this.isAlive) {
            if (this.targetPlayer) {
                const xDiff = this.targetPlayer.position.x - this.position.x;
                const zDiff = this.targetPlayer.position.z - this.position.z;
                const angle = Math.atan2(xDiff, zDiff);
                this.updateHeadRotation(angle);
                this.attemptToShoot();
            } else {
                if (this.path) {
                    if (this.movingToNextPathIndex) {
                        this.position.x += delta * Bot.SPEED * Math.sin(this.bodyRot),
                        this.position.z += delta * Bot.SPEED * Math.cos(this.bodyRot);
                        this.updatePosition(this.position, this.bodyRot);
                    } else {
                        const time = this.getNextTargetPosition();
                        if (time < 0) {
                            this.think();
                        } else {
                            this.movingToNextPathIndex = true;
                            const timeout = setTimeout(() => {
                                this.movingToNextPathIndex = false;
                                this.currentPathIndex ++;
                                this.completeTimeout(timeout);
                            }, time);
                            this.timeouts.push(timeout);
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
            if (this.canTargetPlayer && !this.targetPlayer) {
                this.targetPlayer = this.getClosestVisibleEnemy();
                if (this.targetPlayer) {
                    this.targetEnemy();
                }
            }
        }
    }

    private getNextTargetPosition() {
        if (this.path && this.currentPathIndex < this.path.length - 2) {
            const currentPathPosition = this.path[this.currentPathIndex];
            this.position = new Vector3(currentPathPosition[0], 0, currentPathPosition[1]);

            const targetPathPostion = this.path[this.currentPathIndex + 1];
            this.targetPosition = new Vector3(targetPathPostion[0], 0, targetPathPostion[1]);

            const distance = 1; // Distance is always 1 (diagonal or straight)

            const xDiff = this.targetPosition.x - this.position.x;
            const zDiff = this.targetPosition.z - this.position.z;
            const angle = Math.atan2(xDiff, zDiff);
            this.updatePosition(this.position, angle);

            const time = distance / Bot.SPEED * 1000;
            return time;
        } else {
            return -1;
        }
    }

    private makeDecision() {
        if (!this.path) {
            this.targetPlayer = undefined;
            const selectedEnemy = this.getRandomEnemy();
            if (selectedEnemy) {
                this.path = this.botHandler.getPath(this.lobby, this.position, selectedEnemy.position);
                this.currentPathIndex = 0;
                this.movementVelocity = 0;
                this.movingToNextPathIndex = false;
                if (!this.canTargetPlayer) {
                    const timeout = setTimeout(() => {
                        this.canTargetPlayer = true;
                        this.completeTimeout(timeout);
                    }, this.getRandomTime());
                    this.timeouts.push(timeout);
                }
            } else {
                this.think();
            }
        }
    }

    private targetEnemy() {
        this.canTargetPlayer = false;
        const shootTime = this.getRandomTime();
        const timeout = setTimeout(() => {
            this.think();
            this.completeTimeout(timeout);
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
            if (this.botHandler.hasLineOfSight(this.lobby, this.position, enemy.position)) {
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
}
