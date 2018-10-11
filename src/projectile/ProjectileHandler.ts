import EventHandler from "../EventHandler";
import * as PacketSender from "../PacketSender";
import Player from "../Player";
import PlayerHandler from "../PlayerHandler";
import Vector3 from "../vector/Vector3";
import Projectile from "./Projectile";

export default class ProjectileHandler {

    public static enable() {
        EventHandler.addListener(undefined, EventHandler.Event.PLAYER_SHOOT, ProjectileHandler.onShoot);
        EventHandler.addListener(undefined, EventHandler.Event.GAME_TICK, ProjectileHandler.onTick);
    }

    public static disable() {
        EventHandler.removeListener(undefined, EventHandler.Event.PLAYER_SHOOT, ProjectileHandler.onShoot);
        EventHandler.removeListener(undefined, EventHandler.Event.GAME_TICK, ProjectileHandler.onTick);
    }

    private static projectileId = 0;
    private static projectiles: Projectile[] = [];

    private static onShoot(shooter: Player) {
        const position = shooter.position.clone().add(new Vector3(0.5, 0.75, 0.5));
        const rotation = shooter.headRot;
        const id = ++ ProjectileHandler.projectileId;
        const data = [position.x, position.y, position.z, rotation, id];
        for (let i = 0; i < PlayerHandler.getCount(); i ++) {
            const player = PlayerHandler.getPlayer(i);
            PacketSender.sendProjectileLaunch(player.id, data);
        }
        ProjectileHandler.projectiles.push(new Projectile(position, rotation, id, shooter.id));
    }

    private static onTick(delta: number) {
        for (const projectile of ProjectileHandler.projectiles) {
            projectile.move(delta);
            const projPos = projectile.position;
            const data = [projPos.x, projPos.y, projPos.z, projectile.id];
            for (let i = 0; i < PlayerHandler.getCount(); i ++) {
                const player = PlayerHandler.getPlayer(i);
                PacketSender.sendProjectileMove(player.id, data);
            }
        }
    }
}
