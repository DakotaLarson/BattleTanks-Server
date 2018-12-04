import Vector3 from "../vector/Vector3";
import Powerup from "./Powerup";
import PowerupHandler from "./PowerupHandler";

export default class AmmoPowerup extends Powerup {

    public typeId: number;
    protected regenTime: number;

    constructor(position: Vector3, handler: PowerupHandler) {
        super(position, handler);
        this.typeId = 3;
        this.regenTime = 7.5;
    }
}
