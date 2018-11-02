// import Audio from "./Audio";
// import EventHandler from "./EventHandler";
// import Player from "./Player";
// import PlayerHandler from "./PlayerHandler";

// const DAMAGE = 0.25;

// export default class PlayerDamageHandler {

//     public static enable() {
//         EventHandler.addListener(PlayerDamageHandler, EventHandler.Event.PLAYER_DAMAGE_HITSCAN, PlayerDamageHandler.onHit);
//         EventHandler.addListener(PlayerDamageHandler, EventHandler.Event.PLAYER_DAMAGE_PROJECTILE, PlayerDamageHandler.onHit);

//     }

//     public static onHit(data: any) {
//         let targetHealth = data.target.health;
//         targetHealth = Math.max(targetHealth - DAMAGE, 0);
//         data.target.health = targetHealth;
//         if (targetHealth === 0) {
//             PlayerDamageHandler.handlePlayerDeath(data.target, data.player);
//             EventHandler.callEvent(EventHandler.Event.PLAYER_DEATH, data);
//         } else {
//             for (let i = 0; i < PlayerHandler.getCount(); i ++) {
//                 const player = PlayerHandler.getPlayer(i);
//                 if (player.id !== data.target.id) {
//                     player.sendConnectedPlayerHealth(data.target.id, data.target.health);
//                 } else {
//                     player.sendPlayerHealth(data.target.health);
//                 }
//             }
//         }
//     }

//     private static handlePlayerDeath(target: Player, player: Player) {
//         target.sendAlert("You were killed by: " + player.name);
//         player.sendAlert("You killed: " + target.name);

//         target.sendAudioRequest(Audio.LOSE);

//         target.isAlive = false;
//         const targetId = target.id;
//         for (let i = 0; i < PlayerHandler.getCount(); i ++) {
//             const otherPlayer = PlayerHandler.getPlayer(i);
//             if (otherPlayer.id === targetId) {
//                 otherPlayer.sendPlayerRemoval();

//             } else {
//                 otherPlayer.sendConnectedPlayerRemoval(targetId);
//             }
//         }
//     }
// }
