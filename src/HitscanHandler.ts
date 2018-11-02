// import ArenaLoader from "./ArenaLoader";
// import EventHandler from "./EventHandler";
// import Player from "./Player";
// import Vector3 from "./vector/Vector3";

// export default class HitscanHandler {

//     public static enable() {
//         EventHandler.addListener(HitscanHandler, EventHandler.Event.PLAYER_SHOOT, HitscanHandler.onPlayerShoot);
//     }

//     public static disable() {
//         EventHandler.removeListener(HitscanHandler, EventHandler.Event.PLAYER_SHOOT, HitscanHandler.onPlayerShoot);
//     }

//     public static onPlayerShoot(player: Player) {

//         const parallelAxis = Vector3.fromAngleAboutY(player.headRot);
//         const perpendicularAxis = parallelAxis.cross(new Vector3(0, 1, 0));

//         const projectedTurretPosition = player.position.dot(perpendicularAxis);

//         const playerPos = player.position.clone().add(new Vector3(0.5, 0, 0.5));

//         const hitPlayerData = HitscanHandler.getHitPlayer(player, perpendicularAxis, projectedTurretPosition);

//         if (hitPlayerData.player) {
//             const closestBlockDistance = this.getHitBlockDistance(perpendicularAxis, projectedTurretPosition, playerPos, hitPlayerData.player.position.clone().add(new Vector3(0.5, 0, 0.5)));

//             if (hitPlayerData.distance < closestBlockDistance || closestBlockDistance === -1) {
//                 EventHandler.callEvent(EventHandler.Event.PLAYER_DAMAGE_HITSCAN, {
//                     player,
//                     target: hitPlayerData.player,
//                 });
//             }

//         }
//     }

//     private static getHitPlayer(player: Player, axis: Vector3, turretProjection: number) {

//         let closestPlayer: Player | undefined;
//         let closestDistance: number | undefined;

//         const playerPos = player.position.clone().add(new Vector3(0.5, 0, 0.5));
//         for (let i = 0; i < PlayerHandler.getCount(); i ++) {
//             const otherPlayer = PlayerHandler.getPlayer(i);
//             if (otherPlayer.id === player.id || !otherPlayer.isAlive) { continue; }

//             const corners = HitscanHandler.getPlayerCorners(otherPlayer.bodyRot, otherPlayer.position);
//             if (this.testCorners(corners, axis, turretProjection)) {
//                 const otherPlayerPos = otherPlayer.position.clone().add(new Vector3(0.5, 0, 0.5));
//                 const distance = playerPos.distanceSquared(otherPlayerPos);
//                 if (!(closestPlayer && closestDistance) || distance < closestDistance) {
//                     closestDistance = distance;
//                     closestPlayer = otherPlayer;
//                 }
//             }
//         }
//         return {
//             player: closestPlayer,
//             distance: closestDistance ? closestDistance : 0,
//         };
//     }

//     private static getHitBlockDistance(axis: Vector3, turretProjection: number, playerPos: Vector3, targetPos: Vector3): number {
//         const blockPositions = ArenaLoader.getLoadedArena().blockPositions;
//         let closestPosition: Vector3 | undefined;
//         let closestDistance: number | undefined;

//         const targetXDiff = targetPos.x - playerPos.x;
//         const targetZDiff = targetPos.z - playerPos.z;

//         for (const blockPosition of blockPositions) {
//             const corners = HitscanHandler.getBlockCorners(blockPosition);
//             if (HitscanHandler.testCorners(corners, axis, turretProjection)) {
//                 const testBlockPosition = blockPosition.clone().add(new Vector3(0.5, 0, 0.5));

//                 const blockXDiff = testBlockPosition.x - playerPos.x;
//                 const blockZDiff = testBlockPosition.z - playerPos.z;

//                 if (HitscanHandler.areSignsEqual(blockXDiff, targetXDiff) && HitscanHandler.areSignsEqual(blockZDiff, targetZDiff)) {
//                     if (closestPosition && closestDistance) {

//                         const testDistance = testBlockPosition.distanceSquared(playerPos);

//                         if (testDistance < closestDistance) {
//                             closestDistance = testDistance;
//                             closestPosition = testBlockPosition;
//                         }
//                     } else {

//                         closestPosition = testBlockPosition;
//                         closestDistance = closestPosition.distanceSquared(playerPos);
//                     }
//                 }
//             }
//         }
//         if (closestPosition && closestDistance) {
//             return closestDistance;
//         } else {
//             return -1;
//         }
//     }

//     private static testCorners(corners: Vector3[], axis: Vector3, turretProjection: number): boolean {
//         const projectedCorners: number[] = new Array();

//         for (const corner of corners) {
//             projectedCorners.push(corner.dot(axis));
//         }
//         const maxCorner = Math.max.apply(undefined, projectedCorners);
//         const minCorner = Math.min.apply(undefined, projectedCorners);

//         return turretProjection >= minCorner && turretProjection <= maxCorner;
//     }

//     private static getPlayerCorners(rot: number, pos: Vector3): Vector3[] {
//         const theta = Math.atan(0.5 / 0.75);
//         const frontLeft = HitscanHandler.getPlayerCorner(rot + theta, pos);
//         const frontRight = HitscanHandler.getPlayerCorner(rot - theta, pos);
//         const backLeft = HitscanHandler.getPlayerCorner(Math.PI + rot + theta, pos);
//         const backRight = HitscanHandler.getPlayerCorner(Math.PI + rot - theta, pos);

//         return new Array(frontRight, frontLeft, backLeft, backRight);
//     }

//     private static getBlockCorners(pos: Vector3): Vector3[] {
//         return new Array(
//             new Vector3(pos.x, pos.y, pos.z + 1),
//             new Vector3(pos.x + 1, pos.y, pos.z + 1),
//             new Vector3(pos.x + 1, pos.y, pos.z),
//             new Vector3(pos.x, pos.y,  pos.z),
//         );
//     }

//     private static getPlayerCorner(theta: number, pos: Vector3): Vector3 {
//         const radius = Math.sqrt(0.75 * 0.75 + 0.5 * 0.5);
//         const phi = Math.PI / 2;

//         const x = radius * Math.sin(phi) * Math.sin(theta);
//         const y = 0;
//         const z = radius * Math.sin(phi) * Math.cos(theta);

//         const playerOffset = new Vector3(0.5, 0, 0.5);
//         return new Vector3(x, y, z).add(pos).add(playerOffset);
//     }

//     private static areSignsEqual(a: number, b: number): boolean {
//         return (a <= 0 && b <= 0) || (a >= 0 && b >= 0);
//     }
// }
