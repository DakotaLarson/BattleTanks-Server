import Match from "../core/Match";
import Player from "../entity/Player";
import PlayerHandler from "../entity/PlayerHandler";
import EventHandler from "../main/EventHandler";
import AmmoPowerup from "./AmmoPowerup";
import HealthPowerup from "./HealthPowerup";
import Powerup from "./Powerup";
import ShieldPowerup from "./ShieldPowerup";
import SpeedPowerup from "./SpeedPowerup";

export default class PowerupHandler {

    private static powerupRadius = Math.sqrt(Math.pow(0.35, 2) + Math.pow(0.35, 2));
    private static playerRadius = Math.sqrt(Math.pow(0.5, 2) + Math.pow(0.75, 2));

    private match: Match;
    private powerups: Powerup[];

    constructor(match: Match) {
        this.match = match;

        this.powerups = [];
        for (const position of this.match.arena.shieldPowerupPositions) {
            this.powerups.push(new ShieldPowerup(position, this));
        }
        for (const position of this.match.arena.healthPowerupPositions) {
            this.powerups.push(new HealthPowerup(position, this));
        }
        for (const position of this.match.arena.speedPowerupPositions) {
            this.powerups.push(new SpeedPowerup(position, this));
        }
        for (const position of this.match.arena.ammoPowerupPositions) {
            this.powerups.push(new AmmoPowerup(position, this));
        }
    }

    public enable() {
        for (const powerup of this.powerups) {
            powerup.enable();
        }

        EventHandler.addListener(this, EventHandler.Event.POWERUP_PICKUP, this.onPickupRequest);
    }

    public disable() {
        for (const powerup of this.powerups) {
            powerup.disable();
        }

        EventHandler.removeListener(this, EventHandler.Event.POWERUP_PICKUP, this.onPickupRequest);
    }

    public addPowerup(powerup: Powerup) {
        for (const player of PlayerHandler.getMatchPlayers(this.match)) {
            player.sendPowerupAddition(powerup);
        }
    }

    public removePowerup(powerup: Powerup) {
        for (const player of PlayerHandler.getMatchPlayers(this.match)) {
            player.sendPowerupRemoval(powerup);
        }
    }

    public onPlayerAddition(player: Player) {
        for (const powerup of this.powerups) {
            if (powerup.enabled) {
                player.sendPowerupAddition(powerup);
            }
        }
    }

    private onPickupRequest(data: any) {
        if (this.match.hasPlayer(data.player)) {
            for (const powerup of this.powerups) {
                if (powerup.position.equals(data.position) && powerup.typeId === data.type && powerup.enabled) {
                    const maxDistance = Math.pow(PowerupHandler.powerupRadius, 2) + Math.pow(PowerupHandler.playerRadius, 2);
                    const distance = data.player.position.distanceSquared(powerup.position);
                    if (distance < maxDistance) {
                        if (this.canPickup(data.player, data.type)) {
                            powerup.regen();
                            this.pickup(data.player, data.type);
                        }
                    }
                }
            }
        }
    }

    private canPickup(player: Player, type: number) {
        if (type === 0) {
            return player.shield < 1;
        } else if (type === 1) {
            return player.health < 1;
        } else if (type === 2) {
            return !player.hasSpeedBoost;
        } else if (type === 3) {
            return player.ammoCount < Player.FULL_AMMO_COUNT + Player.AMMO_BOOST;
        } else {
            throw new Error("Unknown type: " + type);
        }
    }

    private pickup(player: Player, type: number) {
        player.sendPowerupPickup();  // Sound.
        if (type === 0) {
            player.boostShield();

            for (const otherPlayer of PlayerHandler.getMatchPlayers(this.match)) {
                if (otherPlayer !== player) {
                    otherPlayer.sendConnectedPlayerShield(player.id, player.shield);
                }
            }
        } else if (type === 1) {
            player.boostHealth();

            for (const otherPlayer of PlayerHandler.getMatchPlayers(this.match)) {
                if (otherPlayer !== player) {
                    otherPlayer.sendConnectedPlayerHealth(player.id, player.health);
                }
            }
        } else if (type === 2) {
            player.boostSpeed();
        } else if (type === 3) {
            player.boostAmmo();
        } else {
            throw new Error("Unknown type: " + type);
        }
    }
}
