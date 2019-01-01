import EventHandler from "../EventHandler";
import Vector3 from "../vector/Vector3";
import CollisionHandler from "./CollisionHandler";

export default class Projectile {

    private static radius = 0.1;
    private static projectileSpeed = 20;
    private static lifespan = 3000;

    public shooterId: number;
    public velocity: Vector3;
    public position: Vector3;

    public perpendicularAxis: Vector3;
    public id: number;

    private collisionHandler: CollisionHandler;
    private taskId: NodeJS.Timer;

    constructor(collisionHandler: CollisionHandler, position: Vector3, rotation: number, id: number, shooterId: number) {
        this.collisionHandler = collisionHandler;

        this.position = position;
        this.velocity = Vector3.fromAngleAboutY(rotation);

        this.perpendicularAxis = this.velocity.clone().cross(new Vector3(0, -1, 0));

        this.id = id;
        this.shooterId = shooterId;

        EventHandler.addListener(this, EventHandler.Event.GAME_TICK, this.move);
        this.taskId = setTimeout(() => {
            EventHandler.callEvent(EventHandler.Event.PROJECTILE_REMOVAL, this);
        }, Projectile.lifespan);
    }

    public move(delta: number) {
        const previousPosition = this.position.clone();

        const travelScalar = delta * Projectile.projectileSpeed;

        this.position.add(this.velocity.clone().multiplyScalar(travelScalar));

        this.collisionHandler.getProjectileCollision(this, previousPosition, travelScalar, this.perpendicularAxis, Projectile.radius, 0);

    }
    public destroy() {
        EventHandler.removeListener(this, EventHandler.Event.GAME_TICK, this.move);
        clearTimeout(this.taskId);
    }
}
