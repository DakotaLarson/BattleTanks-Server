import Vector3 from "../vector/Vector3";
import PowerupHandler from "./PowerupHandler";

export default abstract class Powerup {

    public abstract typeId: number;
    public position: Vector3;

    public enabled: boolean;

    protected abstract regenTime: number;
    protected handler: PowerupHandler;

    private taskId: NodeJS.Timeout | undefined;

    constructor(position: Vector3, handler: PowerupHandler) {
        this.position = position;
        this.handler = handler;
        this.enabled = false;
    }

    public enable() {
        this.handler.addPowerup(this);
        this.enabled = true;
    }

    public disable() {
        this.handler.removePowerup(this);
        this.enabled = false;
        if (this.taskId) {
            clearTimeout(this.taskId);
        }
    }

    public regen() {
        this.handler.removePowerup(this);
        this.enabled = false;
        this.taskId = setTimeout(() => {
            this.handler.addPowerup(this);
            this.taskId = undefined;
            this.enabled = true;
        }, this.regenTime * 1000);
    }
}
