import Match from "../core/Match";
import Player from "../entity/Player";
import PlayerHandler from "../entity/PlayerHandler";
import EventHandler from "../EventHandler";
import Vector3 from "../vector/Vector3";
import Projectile from "./Projectile";

export default class CollisionHandler {

    private match: Match;

    constructor(match: Match) {
        this.match = match;
    }

    public getProjectileCollision(proj: Projectile, initialPosition: Vector3, travelScalar: number, perpendicularAxis: Vector3, radius: number, internal: number) {

        const search = (originalScalar: number, increaseDistance: boolean, newInternal: number) => {
            if (newInternal > 50) {
                console.log("Collision was calculated 50x.");
                return;
            }
            const difference = originalScalar / 2;
            let scalar = originalScalar - difference;
            if (increaseDistance) {
                scalar = originalScalar + difference;
            }
            this.getProjectileCollision(proj, initialPosition, scalar, perpendicularAxis, radius, newInternal);
        };

        const currentPosition = initialPosition.clone().add(proj.velocity.clone().multiplyScalar(travelScalar));

        const projectileCorners = [
            initialPosition.clone().add(perpendicularAxis.clone().multiplyScalar(radius)),
            initialPosition.clone().sub(perpendicularAxis.clone().multiplyScalar(radius)),
            currentPosition.clone().add(perpendicularAxis.clone().multiplyScalar(radius)),
            currentPosition.clone().sub(perpendicularAxis.clone().multiplyScalar(radius)),
        ];

        const offsetX = 0.5;
        const offsetZ = 0.75;

        const blockRadius = 0.75;
        const playerRadius = 1.25;

        const distanceCovered = Math.ceil(initialPosition.distanceSquared(currentPosition));

        const testBlockPositions: Vector3[] = [];
        const testPlayers: Player[] = [];

        for (const blockPos of this.match.arena.blockPositions) {
            if (blockPos.clone().add(new Vector3(0.5, 0, 0.5)).distanceSquared(proj.position) <= distanceCovered + blockRadius) {
                testBlockPositions.push(blockPos);
            }
        }
        for (const player of PlayerHandler.getMatchPlayers(this.match)) {
            if (player.position.clone().add(new Vector3(0.5, 0, 0.5)).distanceSquared(proj.position) <= distanceCovered + playerRadius) {
                if (player.id !== proj.shooterId && player.isAlive) {
                    testPlayers.push(player);
                }
            }
        }

        if (testBlockPositions.length || testPlayers.length) {

            let collidedPlayer;
            let collidedBlock = false;

            const projectileParallelAxis = proj.velocity.clone();
            const projectilePerpendicularAxis = proj.perpendicularAxis.clone();
            const playerCorrection = new Vector3();

            for (const target of testPlayers) {
                const playerCorners = this.getPlayerCorners(target.position.clone().add(new Vector3(0.5, 0, 0.5)), target.bodyRot, offsetX, offsetZ);
                const playerAxes = this.getAxes(target.bodyRot);

                const overlaps = this.getOverlaps([projectileParallelAxis, projectilePerpendicularAxis, playerAxes[0], playerAxes[1]], projectileCorners, playerCorners);

                if (overlaps) {
                    playerCorrection.add(this.getMTV(overlaps));
                    collidedPlayer = target;
                    break;
                }
            }

            const blockAxes = this.getAxes(0);
            const blockCorrection = new Vector3();
            for (const blockPos of this.match.arena.blockPositions) {
                const overlaps = this.getOverlaps([projectileParallelAxis, projectilePerpendicularAxis, blockAxes[0], blockAxes[1]], projectileCorners, this.getBlockCorners(blockPos));

                if (overlaps) {
                    blockCorrection.add(this.getMTV(overlaps));
                    collidedBlock = true;
                }
            }

            if (collidedPlayer || collidedBlock) {

                EventHandler.callEvent(EventHandler.Event.PROJECTILE_REMOVAL, proj);
                if (collidedPlayer) {
                    if (!collidedBlock) {
                        EventHandler.callEvent(EventHandler.Event.PLAYER_DAMAGE_PROJECTILE, {
                            match: this.match,
                            player: this.match.getPlayerById(proj.shooterId),
                            target: collidedPlayer,
                        });
                    } else {
                        search(travelScalar, false, ++ internal);
                    }
                }
            } else if (internal) {
                search(travelScalar, true, ++ internal);
            }
        } else if (internal) {
            search(travelScalar, true, ++ internal);
        }
    }

    private getOverlaps(axes: Vector3[], aCorners: Vector3[], bCorners: Vector3[]) {
        const overlaps = [];
        for (const axis of axes) {
            const overlap = this.overlaps(axis, aCorners, bCorners);
            if (overlap) {
                overlaps.push(overlap);
            } else {
                return undefined;
            }
        }
        return overlaps;
    }

    private getMTV(overlaps: Vector3[]): Vector3 {
        let distance = overlaps[0].lengthSq();
        let shortestVec = overlaps[0];
        for (let k = 1; k < overlaps.length; k++) {
            const squareLength = overlaps[k].lengthSq();
            if (squareLength < distance) {
                distance = squareLength;
                shortestVec = overlaps[k];
            }
        }
        return shortestVec;
    }

    private getPlayerCorners(pos: Vector3, rot: number, offsetX: number, offsetZ: number) {
        const otherCorners = [];

        otherCorners.push(this.getCorner(pos, rot, -offsetX, -offsetZ));
        otherCorners.push(this.getCorner(pos, rot, offsetX, -offsetZ));
        otherCorners.push(this.getCorner(pos, rot, offsetX, offsetZ));
        otherCorners.push(this.getCorner(pos, rot, -offsetX, offsetZ));

        return otherCorners;
    }

    private getBlockCorners(pos: Vector3) {
        const blockCornerPositions = [];

        blockCornerPositions.push(pos.clone());
        blockCornerPositions.push(pos.clone().add(new Vector3(0, 0, 1)));
        blockCornerPositions.push(pos.clone().add(new Vector3(1, 0, 1)));
        blockCornerPositions.push(pos.clone().add(new Vector3(1, 0, 0)));

        return blockCornerPositions;
    }

    private getAxes(rot: number) {
        const parallelAxis = new Vector3(Math.sin(rot), 0, Math.cos(rot));
        const perpendicularAxis = parallelAxis.clone().cross(new Vector3(0, -1, 0));
        return [parallelAxis, perpendicularAxis];
    }

    private overlaps(axis: Vector3, playerCorners: Vector3[], blockCorners: Vector3[]): Vector3 | undefined {

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

    private getCorner(pos: Vector3, rot: number, offsetX: number, offsetZ: number) {

        const x = pos.x + offsetX * Math.cos(rot) - offsetZ * Math.sin(rot);
        const z = pos.z - offsetX * Math.sin(rot) - offsetZ * Math.cos(rot);

        return new Vector3(x, 0, z);
    }
}
