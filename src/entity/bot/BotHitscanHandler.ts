import Arena from "../../Arena";
import Vector3 from "../../vector/Vector3";

export default class BotHitscanHandler {

    private static readonly X_OFFSET = 0.5;
    private static readonly Z_OFFSET = 0.75;

    private blockPositions: Vector3[];

    constructor(arena: Arena) {
        this.blockPositions = arena.blockPositions;
    }

    public hasLineOfSight(from: Vector3, to: Vector3, targetRot: number) {

        const xDiff = to.x - from.x;
        const zDiff = to.z - from.z;
        const turretAngle = Math.atan2(xDiff, zDiff);

        const parallelAxis = Vector3.fromAngleAboutY(turretAngle);
        const perpendicularAxis = parallelAxis.cross(new Vector3(0, 1, 0));

        const projectedTurretPosition = from.dot(perpendicularAxis);

        const corners = this.getPlayerCorners(to, targetRot, BotHitscanHandler.X_OFFSET, BotHitscanHandler.Z_OFFSET);
        if (this.testCorners(corners, perpendicularAxis, projectedTurretPosition)) {
            const targetDistance = from.distanceSquared(to);

            const closestBlockDistance = this.getHitBlockDistance(perpendicularAxis, projectedTurretPosition, from, to);

            if (targetDistance < closestBlockDistance || closestBlockDistance === -1) {
                // Collision is valid.
                return true;
            }
        }
        return false;
    }

    private getHitBlockDistance(axis: Vector3, turretProjection: number, playerPos: Vector3, targetPos: Vector3): number {

        let closestPosition: Vector3 | undefined;
        let closestDistance: number | undefined;

        const targetXDiff = targetPos.x - playerPos.x;
        const targetZDiff = targetPos.z - playerPos.z;

        for (const blockPosition of this.blockPositions) {
            const corners = this.getBlockCorners(blockPosition);
            if (this.testCorners(corners, axis, turretProjection)) {
                const testBlockPosition = blockPosition.clone().add(new Vector3(0.5, 0, 0.5));

                const blockXDiff = testBlockPosition.x - playerPos.x;
                const blockZDiff = testBlockPosition.z - playerPos.z;

                if (this.areSignsEqual(blockXDiff, targetXDiff) && this.areSignsEqual(blockZDiff, targetZDiff)) {
                    if (closestPosition && closestDistance) {

                        const testDistance = testBlockPosition.distanceSquared(playerPos);

                        if (testDistance < closestDistance) {
                            closestDistance = testDistance;
                            closestPosition = testBlockPosition;
                        }
                    } else {

                        closestPosition = testBlockPosition;
                        closestDistance = closestPosition.distanceSquared(playerPos);
                    }
                }
            }
        }
        if (closestPosition && closestDistance) {
            return closestDistance;
        } else {
            return -1;
        }
    }

    private testCorners(corners: Vector3[], axis: Vector3, turretProjection: number): boolean {
        const projectedCorners: number[] = new Array();

        for (const corner of corners) {
            projectedCorners.push(corner.dot(axis));
        }
        const maxCorner = Math.max.apply(undefined, projectedCorners);
        const minCorner = Math.min.apply(undefined, projectedCorners);

        return turretProjection >= minCorner && turretProjection <= maxCorner;
    }

    private getPlayerCorners(pos: Vector3, rot: number, offsetX: number, offsetZ: number) {
        const otherCorners = [];

        // Order of corners doesn't matter.
        otherCorners.push(this.getCorner(pos, rot, -offsetX, -offsetZ));
        otherCorners.push(this.getCorner(pos, rot, offsetX, -offsetZ));
        otherCorners.push(this.getCorner(pos, rot, offsetX, offsetZ));
        otherCorners.push(this.getCorner(pos, rot, -offsetX, offsetZ));

        return otherCorners;
    }

    private getBlockCorners(pos: Vector3) {
        const blockCornerPositions = [];

        // Order of corners doesn't matter.
        blockCornerPositions.push(pos.clone());
        blockCornerPositions.push(pos.clone().add(new Vector3(0, 0, 1)));
        blockCornerPositions.push(pos.clone().add(new Vector3(1, 0, 1)));
        blockCornerPositions.push(pos.clone().add(new Vector3(1, 0, 0)));

        return blockCornerPositions;
    }

    private areSignsEqual(a: number, b: number): boolean {
        return (a <= 0 && b <= 0) || (a >= 0 && b >= 0);
    }

    private getCorner(pos: Vector3, rot: number, offsetX: number, offsetZ: number) {

        const x = pos.x + offsetX * Math.cos(rot) - offsetZ * Math.sin(rot);
        const z = pos.z - offsetX * Math.sin(rot) - offsetZ * Math.cos(rot);

        return new Vector3(x, 0, z);
    }
}
