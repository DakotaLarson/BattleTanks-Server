import Vector3 from "../vector/Vector3";
import PowerupHandler from "./PowerupHandler";

export default abstract class Powerup {

    public abstract typeId: number;
    public position: Vector3;

    protected abstract regenTime: number;
    protected handler: PowerupHandler;

    private taskId: NodeJS.Timeout | undefined;

    constructor(position: Vector3, handler: PowerupHandler) {
        this.position = position;
        this.handler = handler;
    }

    public enable() {
        this.handler.addPowerup(this);
    }

    public disable() {
        this.handler.removePowerup(this);
        if (this.taskId) {
            clearTimeout(this.taskId);
        }
    }

    public regen() {
        this.handler.removePowerup(this);
        this.taskId = setTimeout(() => {
            this.handler.addPowerup(this);
            this.taskId = undefined;
        }, this.regenTime * 1000);
    }
}
