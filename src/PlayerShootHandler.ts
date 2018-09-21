import EventHandler from './EventHandler';
import Player from './Player';
import PlayerHandler from './PlayerHandler';
import Vector3 from './Vector3';
import ArenaLoader from './ArenaLoader';

export default class PlayerShootHandler{

    static enable(){
        EventHandler.addListener(PlayerShootHandler, EventHandler.Event.PLAYER_SHOOT, PlayerShootHandler.onPlayerShoot);
    } 

    static disable(){
        EventHandler.removeListener(PlayerShootHandler, EventHandler.Event.PLAYER_SHOOT, PlayerShootHandler.onPlayerShoot);
    }

    static onPlayerShoot(player: Player){

        let parallelAxis = Vector3.fromAngleAboutY(player.headRot);
        let perpendicularAxis = parallelAxis.cross(new Vector3(0, 1, 0));

        let projectedTurretPosition = player.pos.dot(perpendicularAxis);

        let playerPos = player.pos.clone().add(new Vector3(0.5, 0, 0.5));

        let hitPlayerData = PlayerShootHandler.getHitPlayer(player, perpendicularAxis, projectedTurretPosition);

        if(hitPlayerData.player){
            let closestBlockDistance = this.getHitBlockDistance(perpendicularAxis, projectedTurretPosition, playerPos, hitPlayerData.player.pos.clone().add(new Vector3(0.5, 0, 0.5)));

            if(hitPlayerData.distance < closestBlockDistance || closestBlockDistance === -1){
                EventHandler.callEvent(EventHandler.Event.PLAYER_HIT_PLAYER, {
                    player: player,
                    target: hitPlayerData.player
                });
            }

        }
    }

    private static getHitPlayer(player: Player, axis: Vector3, turretProjection: number){
        
        let closestPlayer: Player;
        let closestDistance: number;

        let playerPos = player.pos.clone().add(new Vector3(0.5, 0, 0.5));
        for(let i = 0; i < PlayerHandler.getCount(); i ++){
            let otherPlayer = PlayerHandler.getPlayer(i);
            if(otherPlayer.id === player.id || !otherPlayer.isAlive) continue;

            let corners = PlayerShootHandler.getPlayerCorners(otherPlayer.bodyRot, otherPlayer.pos);
            if(this.testCorners(corners, axis, turretProjection)){
                let otherPlayerPos = otherPlayer.pos.clone().add(new Vector3(0.5, 0, 0.5));
                let distance = playerPos.distanceSquared(otherPlayerPos);
                if(!closestPlayer || distance < closestDistance){
                    closestDistance = distance;
                    closestPlayer = otherPlayer;
                }
            }
        }
        return {
            player: closestPlayer,
            distance: closestDistance
        };
    }

    private static getHitBlockDistance(axis: Vector3, turretProjection: number, playerPos: Vector3, targetPos: Vector3): number{
        let blockPositions = ArenaLoader.getLoadedArena().blockPositions; 
        let closestPosition: Vector3;
        let closestDistance: number;

        let targetXDiff = targetPos.x - playerPos.x;
        let targetZDiff = targetPos.z - playerPos.z;

        for(let i = 0; i < blockPositions.length; i ++){
            let corners = PlayerShootHandler.getBlockCorners(blockPositions[i]);
            if(PlayerShootHandler.testCorners(corners, axis, turretProjection)){
                let testBlockPosition = blockPositions[i].clone().add(new Vector3(0.5, 0, 0.5));

                let blockXDiff = testBlockPosition.x - playerPos.x;
                let blockZDiff = testBlockPosition.z - playerPos.z;

                if(PlayerShootHandler.areSignsEqual(blockXDiff, targetXDiff) && PlayerShootHandler.areSignsEqual(blockZDiff, targetZDiff)){
                    if(closestPosition){
                    
                        let testDistance = testBlockPosition.distanceSquared(playerPos);
                        
                        if(testDistance < closestDistance){
                            closestDistance = testDistance;
                            closestPosition = testBlockPosition;
                        }
                    }else{
                        
                        closestPosition = testBlockPosition;
                        closestDistance = closestPosition.distanceSquared(playerPos);
                    }
                }  
            }
        }
        if(closestPosition){
            return closestDistance;
        }else{
            return -1;
        }
    }

    private static testCorners(corners: Array<Vector3>, axis: Vector3, turretProjection: number): boolean{
        let projectedCorners: Array<number> = new Array();

        for(let i = 0; i < corners.length; i ++){
            projectedCorners.push(corners[i].dot(axis));
        }
        let maxCorner = Math.max.apply(null, projectedCorners);
        let minCorner = Math.min.apply(null, projectedCorners);

        return turretProjection >= minCorner && turretProjection <=maxCorner;
    }

    private static getPlayerCorners(rot: number, pos: Vector3): Array<Vector3>{
        const theta = Math.atan(0.5/0.75);
        let frontLeft = PlayerShootHandler.getPlayerCorner(rot + theta, pos);
        let frontRight = PlayerShootHandler.getPlayerCorner(rot - theta, pos);
        let backLeft = PlayerShootHandler.getPlayerCorner(Math.PI + rot + theta, pos);
        let backRight = PlayerShootHandler.getPlayerCorner(Math.PI + rot - theta, pos);

        return new Array(frontRight, frontLeft, backLeft, backRight);
    }

    private static getBlockCorners(pos: Vector3): Array<Vector3>{
        return new Array(
            new Vector3(pos.x, pos.y, pos.z + 1),
            new Vector3(pos.x + 1, pos.y, pos.z + 1),
            new Vector3(pos.x + 1, pos.y, pos.z),
            new Vector3(pos.x, pos.y,  pos.z)
        );
    }

    private static getPlayerCorner(theta: number, pos: Vector3): Vector3{
        const radius = Math.sqrt(0.75 * 0.75 + 0.5 * 0.5);
        const phi = Math.PI / 2;
        
        let x = radius * Math.sin(phi) * Math.sin(theta);
        let y = 0;
        let z = radius * Math.sin(phi) * Math.cos(theta);

        let playerOffset = new Vector3(0.5, 0, 0.5);
        return new Vector3(x, y, z).add(pos).add(playerOffset);
    }

    private static areSignsEqual(a: number, b: number): boolean{
        return (a <= 0 && b <= 0) || (a >= 0 && b >= 0);
    }
}