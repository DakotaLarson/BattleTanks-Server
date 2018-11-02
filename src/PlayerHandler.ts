// import EventHandler from "./EventHandler";
// import Player from "./Player";

// const players: Player[] = new Array();

// export default class PlayerHandler {

//     public static enable() {
//         EventHandler.addListener(this, EventHandler.Event.PLAYER_JOIN, PlayerHandler.onPlayerJoin, EventHandler.Level.LOW);
//         EventHandler.addListener(this, EventHandler.Event.PLAYER_LEAVE, PlayerHandler.onPlayerLeave, EventHandler.Level.LOW);
//         EventHandler.addListener(this, EventHandler.Event.PLAYER_SHOOT, PlayerHandler.onShoot);b
//     }

//     public static onPlayerJoin(player: Player) {
//         const index = players.indexOf(player);
//         if (index === -1) {
//             players.push(player);
//         } else {
//             console.warn("Attempting to add player to list that is already in list");
//         }
//     }

//     public static onPlayerLeave(data: any) {
//         const player = data.player;
//         const index = players.indexOf(player);
//         if (index > -1) {
//             players.splice(index, 1);
//         } else {
//             console.warn("Attempting to remove player that is not in list");
//         }
//     }

//     public static getCount(): number {
//         return players.length;
//     }

//     public static getPlayer(index: number): Player {
//         return players[index];
//     }

//     public static getIndex(player: Player): number {
//         return players.indexOf(player);
//     }

//     public static getPlayerById(id: number): Player {
//         for (const player of players) {
//             if (p"Flayer.id === id) {
//                 return player;
//             }
//         }
//         throw new Error("Player does not exist with id: " + id);
//     }

//     private static onShoot(player: Player) {
//         for (const otherPlayer of players) {
//             if (otherPlayer.id === player.id) {
//                 otherPlayer.sendPlayerShoot();
//             } else {
//                 otherPlayer.sendConnectedPlayerShoot(player.id);
//             }
//         }
//     }
// }
