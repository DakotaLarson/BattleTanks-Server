import EventHandler from "./EventHandler";
import Player from "./Player";
import PlayerHandler from "./PlayerHandler";
import Projectile from "./projectile/Projectile";
import Vector3 from "./vector/Vector3";

let blockPositions: Vector3[] = [];

export default class CollisionHandler {

    public static getProjectileCollision(proj: Projectile, projectileCorners: Vector3[], distanceCovered: number) {

        const offsetX = 0.5;
        const offsetZ = 0.75;

        const blockRadius = 0.75;
        const playerRadius = 1.25;

        distanceCovered = Math.ceil(distanceCovered);

        const testBlockPositions: Vector3[] = [];
        const testPlayers: Player[] = [];

        for (const blockPos of blockPositions) {
            if (blockPos.clone().add(new Vector3(0.5, 0, 0.5)).distanceSquared(proj.position) <= distanceCovered + blockRadius) {
                testBlockPositions.push(blockPos);
            }
        }
        for (let i = 0; i < PlayerHandler.getCount(); i ++) {
            const player = PlayerHandler.getPlayer(i);

            if (player.position.clone().add(new Vector3(0.5, 0, 0.5)).distanceSquared(proj.position) <= distanceCovered + playerRadius) {
                if (player.id !== proj.shooterId) {
                    testPlayers.push(player);
                }
            }
        }

        if (testBlockPositions.length || testPlayers.length) {

            const projectileParallelAxis = proj.velocity.clone();
            const projectilePerpendicularAxis = proj.perpendicularAxis.clone();

            for (const target of testPlayers) {
                const playerCorners = CollisionHandler.getPlayerCorners(target.position.clone().add(new Vector3(0.5, 0, 0.5)), target.bodyRot, offsetX, offsetZ);
                const playerAxes = this.getAxes(target.bodyRot);
                const collides = this.getOverlaps([projectileParallelAxis, projectilePerpendicularAxis, playerAxes[0], playerAxes[1]], projectileCorners, playerCorners);
                if (collides) {
                    EventHandler.callEvent(EventHandler.Event.PROJECTILE_COLLISION, proj);
                    EventHandler.callEvent(EventHandler.Event.PLAYER_DAMAGE_PROJECTILE, {
                        player: PlayerHandler.getPlayerById(proj.shooterId),
                        target,
                    });
                    return;
                }
            }

            const blockAxes = CollisionHandler.getAxes(0);

            for (const blockPos of blockPositions) {
                const collides = this.getOverlaps([projectileParallelAxis, projectilePerpendicularAxis, blockAxes[0], blockAxes[1]], projectileCorners, CollisionHandler.getBlockCorners(blockPos));
                if (collides) {
                    EventHandler.callEvent(EventHandler.Event.PROJECTILE_COLLISION, proj);
                    return;
                }
            }
        }
    }

    public static updateBlockPositions(positions: Vector3[] | undefined) {
        blockPositions = positions ? positions : [];
    }

    private static getOverlaps(axes: Vector3[], aCorners: Vector3[], bCorners: Vector3[]) {
        const overlaps = [];
        for (const axis of axes) {
            const overlap = CollisionHandler.overlaps(axis, aCorners, bCorners);
            if (overlap) {
                overlaps.push(overlap);
            } else {
                return undefined;
            }
        }
        return overlaps;
    }

    private static getPlayerCorners(pos: Vector3, rot: number, offsetX: number, offsetZ: number) {
        const otherCorners = [];

        otherCorners.push(CollisionHandler.getCorner(pos, rot, -offsetX, -offsetZ));
        otherCorners.push(CollisionHandler.getCorner(pos, rot, offsetX, -offsetZ));
        otherCorners.push(CollisionHandler.getCorner(pos, rot, offsetX, offsetZ));
        otherCorners.push(CollisionHandler.getCorner(pos, rot, -offsetX, offsetZ));

        return otherCorners;
    }

    private static getBlockCorners(pos: Vector3) {
        const blockCornerPositions = [];

        blockCornerPositions.push(pos.clone());
        blockCornerPositions.push(pos.clone().add(new Vector3(0, 0, 1)));
        blockCornerPositions.push(pos.clone().add(new Vector3(1, 0, 1)));
        blockCornerPositions.push(pos.clone().add(new Vector3(1, 0, 0)));

        return blockCornerPositions;
    }

    private static getAxes(rot: number) {
        const parallelAxis = new Vector3(Math.sin(rot), 0, Math.cos(rot));
        const perpendicularAxis = parallelAxis.clone().cross(new Vector3(0, -1, 0));
        return [parallelAxis, perpendicularAxis];
    }

    private static overlaps(axis: Vector3, playerCorners: Vector3[], blockCorners: Vector3[]): Vector3 | undefined {

        const playerScalars: number[] = new Array();
        const blockScalars: number[] = new Array();

        for (let k = 0; k < 4; k ++) {
            playerScalars.push(playerCorners[k].dot(axis));
            blockScalars.push(blockCorners[k].dot(axis));
        }

        const playerMax = Math.max.apply(undefined, playerScalars);
        const playerMin = Math.min.apply(undefined, playerScalars);

        const blockMax = Math.max.apply(undefined, blockScalars);
        const blockMin = Math.min.apply(undefined, blockScalars);

        if (!(blockMin > playerMax || blockMax < playerMin)) {
            let overlap = playerMax - blockMin;
            if (playerMax > blockMax) {
                overlap = - (blockMax - playerMin);
            }

            return axis.clone().multiplyScalar(overlap);
        }
        return undefined;
    }

    private static getCorner(pos: Vector3, rot: number, offsetX: number, offsetZ: number) {

        const x = pos.x + offsetX * Math.cos(rot) - offsetZ * Math.sin(rot);
        const z = pos.z - offsetX * Math.sin(rot) - offsetZ * Math.cos(rot);

        return new Vector3(x, 0, z);
    }
}
