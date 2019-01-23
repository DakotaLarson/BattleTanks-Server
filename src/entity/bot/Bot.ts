import Lobby from "../../core/Lobby";
import EventHandler from "../../EventHandler";
import Vector3 from "../../vector/Vector3";
import Player from "../Player";
import BotHandler from "./BotHandler";

export default class Bot extends Player {

    private static readonly SHORT_THINK_TIME = 500;
    private static readonly LONG_THINK_TIME = 2000;

    private static readonly SPEED = 5;

    private lobby: Lobby;
    private botHandler: BotHandler;

    private path: number[][] | undefined;
    private targetPosition: Vector3;
    private currentPathIndex: number;
    private movingToNextPathIndex: boolean;

    private timeouts: NodeJS.Timeout[];

    constructor(id: number, lobby: Lobby, botHandler: BotHandler) {
        super("Guest", id);
        this.lobby = lobby;
        this.botHandler = botHandler;

        this.targetPosition = new Vector3();
        this.currentPathIndex = 0;
        this.movingToNextPathIndex = false;

        this.timeouts = [];
    }

    public enable() {
        EventHandler.addListener(this, EventHandler.Event.GAME_TICK, this.onTick);
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
        const time = Math.random() * (Bot.LONG_THINK_TIME - Bot.SHORT_THINK_TIME) + Bot.SHORT_THINK_TIME;
        this.path = undefined;
        this.movementVelocity = 0;
        const timeout = setTimeout(() => {
            this.makeDecision();
            this.completeTimeout(timeout);
        }, time);
        this.timeouts.push(timeout);
    }

    protected onTick(delta: number) {
        super.onTick(delta);
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
        }
    }

    private getNextTargetPosition() {
        if (this.path && this.currentPathIndex < this.path.length - 2) {
            const currentPathPosition = this.path[this.currentPathIndex];
            this.position = new Vector3(currentPathPosition[0], 0, currentPathPosition[1]);

            const targetPathPostion = this.path[this.currentPathIndex + 1];
            this.targetPosition = new Vector3(targetPathPostion[0], 0, targetPathPostion[1]);

            const distance = 1;

            const xDiff = this.targetPosition.x - this.position.x;
            const zDiff = this.targetPosition.z - this.position.z;
            const angle = Math.atan2(xDiff, zDiff);
            this.updatePosition(this.position, angle);

            const time = distance / Bot.SPEED * 1000;
            return time;
        } else {
            console.log("end of path?");
            return -1;
        }
    }

    private makeDecision() {
        if (!this.path) {
            const selectedEnemy = this.lobby.getRandomEnemy(this);
            this.path = this.botHandler.getPath(this.lobby, this.position, selectedEnemy.position);
            this.currentPathIndex = 0;
            this.movementVelocity = 0;
            this.movingToNextPathIndex = false;
        }
    }

    private completeTimeout(timeout: NodeJS.Timeout) {
        if (this.timeouts.includes(timeout)) {
            this.timeouts.splice(this.timeouts.indexOf(timeout), 1);
        }
    }

    private updatePosition(position: Vector3, angle: number) {
        this.bodyRot = angle;
        this.headRot = angle;
        this.position = position;
        this.movementVelocity = Bot.SPEED;

        EventHandler.callEvent(EventHandler.Event.PLAYER_MOVE, this);
    }
}
