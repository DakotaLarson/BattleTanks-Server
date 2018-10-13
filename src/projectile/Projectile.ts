import CollisionHandler from "../CollisionHandler";
import EventHandler from "../EventHandler";
import Vector3 from "../vector/Vector3";

export default class Projectile {

    private static radius = 0.1;
    private static projectileSpeed = 5;

    public shooterId: number;
    public velocity: Vector3;
    public position: Vector3;

    public perpendicularAxis: Vector3;
    public id: number;

    constructor(position: Vector3, rotation: number, id: number, shooterId: number) {
        this.position = position;
        this.velocity = Vector3.fromAngleAboutY(rotation),
        this.perpendicularAxis = this.velocity.clone().cross(new Vector3(0, -1, 0));
        this.id = id;
        this.shooterId = shooterId;

        EventHandler.addListener(this, EventHandler.Event.GAME_TICK, this.move);
    }

    public move(delta: number) {
        const previousPosition = this.position.clone();

        const corner1 = previousPosition.clone().add(this.perpendicularAxis.clone().multiplyScalar(Projectile.radius));
        const corner2 = previousPosition.clone().sub(this.perpendicularAxis.clone().multiplyScalar(Projectile.radius));

        this.position.add(this.velocity.clone().multiplyScalar(delta * Projectile.projectileSpeed));

        const currentPosition = this.position.clone();

        const corner3 = currentPosition.clone().add(this.perpendicularAxis.clone().multiplyScalar(Projectile.radius));
        const corner4 = currentPosition.clone().sub(this.perpendicularAxis.clone().multiplyScalar(Projectile.radius));

        const distanceCovered = previousPosition.distanceSquared(currentPosition);

        CollisionHandler.getProjectileCollision(this, [corner1, corner2, corner3, corner4], distanceCovered);

    }
    public destroy() {
        EventHandler.removeListener(this, EventHandler.Event.GAME_TICK, this.move);
    }
}
