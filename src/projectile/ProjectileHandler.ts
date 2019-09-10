import Match from "../core/Match";
import Player from "../entity/Player";
import PlayerHandler from "../entity/PlayerHandler";
import EventHandler from "../main/EventHandler";
import Vector3 from "../vector/Vector3";
import CollisionHandler from "./CollisionHandler";
import Projectile from "./Projectile";

export default class ProjectileHandler {

    private static readonly PROJECTILE_HEIGHTS: Map<string, number> = new Map([
        ["0", 0.575],
        ["1", 0.85],
        ["2", 0.92],
        ["3", 0.6],
        ["4", 0.55],
        ["5", 0.5],
        ["6", 0.5],
        ["7", 0.5],
        ["8", 0.45],
        ["9", 0.4],
        ["10", 0.75],
        ["11", 0.6],
        ["12", 0.5],

    ]);

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

        for (const projectile of this.projectiles) {
            projectile.destroy();
        }

        this.projectiles = [];
        for (const player of PlayerHandler.getMatchPlayers(this.match)) {
            player.sendProjectileClear();
        }
    }

    private onShoot(shooter: Player) {
        if (this.match.hasPlayer(shooter)) {

            const height = ProjectileHandler.PROJECTILE_HEIGHTS.get(shooter.modelId)!;
            const position = shooter.position.clone().add(new Vector3(0, height, 0));
            const rotation = shooter.headRot + Math.PI;
            const id = ++ this.projectileId;
            const data = [position.x, position.y, position.z, rotation, id];

            shooter.sendPlayerShoot();
            for (const player of PlayerHandler.getMatchPlayers(this.match)) {
                if (player.id !== shooter.id) {
                    player.sendConnectedPlayerShoot(shooter.id);
                }
                player.sendProjectileLaunch(data);
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
                player.sendProjectileRemoval(proj.id);
            }
        }
    }
}
