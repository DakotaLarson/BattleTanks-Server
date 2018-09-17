import EventHandler from './EventHandler';
import Player from './Player';
import PlayerHandler from './PlayerHandler';
import Vector3 from './Vector3';

export default class PlayerShootHandler{

    static enable(){
        EventHandler.addListener(null, EventHandler.Event.PLAYER_SHOOT, PlayerShootHandler.onPlayerShoot);
    }

    static onPlayerShoot(player: Player){
        console.log('shot fired ' + player.id);
        console.log(player.headRot);

        const radius = Math.sqrt(0.75 * 0.75 + 0.5 * 0.5);
        const phi = Math.PI / 2;
        const theta = Math.atan(0.5/0.75);

        

        /*
        
         playerCornerPositions.push(new Vector3().setFromSpherical(new Spherical(radius, phi, rot - theta)).add(pos).setY(0));
            
            //front left
            playerCornerPositions.push(new Vector3().setFromSpherical(new Spherical(radius, phi, rot + theta)).add(pos).setY(0));

            //back left
            playerCornerPositions.push(new Vector3().setFromSpherical(new Spherical(radius, phi,  Math.PI + rot - theta)).add(pos).setY(0));

            //back right
            playerCornerPositions.push(new Vector3().setFromSpherical(new Spherical(radius, phi,  Math.PI + rot + theta)).add(pos).setY(0));
        */
        //let perpendicularAxis = Vector3.fromAngleAboutY(player.headRot).getPerpendicularAboutY();

        let perpendicularAxis = Vector3.fromAngleAboutY(player.headRot).cross(new Vector3(0, 1, 0));
        for(let i = 0; i < PlayerHandler.getCount(); i ++){
            let otherPlayer = PlayerHandler.getPlayer(i);
            if(otherPlayer.id === player.id) continue;

            let corners = PlayerShootHandler.getPlayerCorners(otherPlayer.bodyRot, otherPlayer.pos);
            
            let projectedCorners: Array<number> = new Array();
            for(let i = 0; i < corners.length; i ++){
                projectedCorners.push(corners[i].dot(perpendicularAxis));
            }
            let maxCorner = Math.max.apply(null, projectedCorners);
            let minCorner = Math.min.apply(null, projectedCorners);

            let projectedTurretPosition = player.pos.dot(perpendicularAxis);

            console.log(minCorner + ' ' + maxCorner + ' ' + projectedTurretPosition);

            if(projectedTurretPosition >= minCorner && projectedTurretPosition <=maxCorner){
                console.log('HIT!');
            }
                
        }
    }

    private static getPlayerCorners(rot: number, pos: Vector3): Array<Vector3>{
        const theta = Math.atan(0.5/0.75);
        let frontLeft = PlayerShootHandler.getCorner(rot + theta, pos);
        let frontRight = PlayerShootHandler.getCorner(rot - theta, pos);
        let backLeft = PlayerShootHandler.getCorner(Math.PI + rot + theta, pos);
        let backRight = PlayerShootHandler.getCorner(Math.PI + rot - theta, pos);

        return new Array(frontRight, frontLeft, backLeft, backRight);
    }
    private static getCorner(theta: number, pos: Vector3): Vector3{
        const radius = Math.sqrt(0.75 * 0.75 + 0.5 * 0.5);
        const phi = Math.PI / 2;
        
        let x = radius * Math.sin(phi) * Math.sin(theta);
        let y = 0;
        let z = radius * Math.sin(phi) * Math.cos(theta);

        let playerOffset = new Vector3(0.5, 0, 0.75 - 0.25);
        return new Vector3(x, y, z).add(pos).add(playerOffset);
    }
}