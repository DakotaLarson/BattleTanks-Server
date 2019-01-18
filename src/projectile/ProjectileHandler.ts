import Match from "../core/Match";
import PlayerHandler from "../entity/PlayerHandler";
import EventHandler from "../EventHandler";
import * as PacketSender from "../PacketSender";
import Player from "../Player";
import Vector3 from "../vector/Vector3";
import CollisionHandler from "./CollisionHandler";
import Projectile from "./Projectile";

export default class ProjectileHandler {

    private match: Match;

    private collisionHandler: CollisionHandler;

    private projectileId: number;
    private projectiles: Projectile[];

    constructor(match: Match) {
        this.match = match;

        this.collisionHandler = new CollisionHandler(this.match);

        this.projectileId = 0;
        this.projectiles = [];
    }

    public enable() {
        EventHandler.addListener(this, EventHandler.Event.PLAYER_SHOOT, this.onShoot);
        EventHandler.addListener(this, EventHandler.Event.PROJECTILE_REMOVAL, this.onRemoval);
    }

    public disable() {
        EventHandler.removeListener(this, EventHandler.Event.PLAYER_SHOOT, this.onShoot);
        EventHandler.removeListener(this, EventHandler.Event.PROJECTILE_REMOVAL, this.onRemoval);

        this.projectiles = [];
        for (const player of PlayerHandler.getMatchPlayers(this.match)) {
            PacketSender.sendProjectileClear(player.id);
        }
    }

    private onShoot(shooter: Player) {
        if (this.match.hasPlayer(shooter)) {

            const position = shooter.position.clone().add(new Vector3(0.5, 0.725, 0.5));
            const rotation = shooter.headRot;
            const id = ++ this.projectileId;
            const data = [position.x, position.y, position.z, rotation, id];

            shooter.sendPlayerShoot();
            for (const player of PlayerHandler.getMatchPlayers(this.match)) {
                if (player.id !== shooter.id) {
                    player.sendConnectedPlayerShoot(shooter.id);
                }
                PacketSender.sendProjectileLaunch(player.id, data);
            }

            this.projectiles.push(new Projectile(this.collisionHandler, position, rotation, id, shooter.id));

            EventHandler.callEvent(EventHandler.Event.STATS_SHOT, {
                match: this.match,
                player: shooter.id,
            });
        }
    }

    private onRemoval(proj: Projectile) {
        const index = this.projectiles.indexOf(proj);
        if (index > -1) {
            this.projectiles.splice(index, 1);
            proj.destroy();
            for (const player of PlayerHandler.getMatchPlayers(this.match)) {
                PacketSender.sendProjectileRemoval(player.id, proj.id);
            }
        }
    }
}
