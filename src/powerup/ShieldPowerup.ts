import Vector3 from "../vector/Vector3";
import Powerup from "./Powerup";
import PowerupHandler from "./PowerupHandler";

export default class ShieldPowerup extends Powerup {

    public typeId: number;
    protected regenTime: number;

    constructor(position: Vector3, handler: PowerupHandler) {
        super(position, handler);
        this.typeId = 0;
        this.regenTime = 3;
    }
}
