// import MatchStatus from "../MatchStatus";
// import Player from "../Player";
// import Vector4 from "../vector/Vector4";
// import Match from "./Match";

// export default class InfiniteMatch extends Match {

//     public wait() {

//         this.projectileHandler.disable();
//         this.gamemode.disable();

//         this.matchStatus = MatchStatus.WAITING;

//         for (const player of this.players) {
//             player.sendGameStatus(this.matchStatus);
//         }
//     }

//     public prepare(): void {
//         throw new Error("Method not implemented.");
//     }

//     public run() {

//         this.matchStatus = MatchStatus.RUNNING;

//         for (const player of this.players) {
//             player.isAlive = true;
//             player.sendGameStatus(this.matchStatus);
//             player.sendAlert("Match has started!");
//             player.sendCooldownTime(1);
//         }

//         this.projectileHandler.enable();
//         this.gamemode.enable();
//     }

//     public finish(winner?: Player | undefined): void {
//         throw new Error("Method not implemented.");
//     }

//     public addPlayer(player: Player) {
//         player.sendArena(this.arena.getRawData());
//         const spawn = this.arena.getNextGameSpawn();

//         player.sendPlayerAddition(spawn);
//         for (const otherPlayer of this.players) {
//             const otherPlayerPos = new Vector4(otherPlayer.position.x, otherPlayer.position.y, otherPlayer.position.z, otherPlayer.bodyRot);

//             otherPlayer.sendConnectedPlayerAddition(player.id, player.name, spawn, player.headRot);
//             player.sendConnectedPlayerAddition(otherPlayer.id, otherPlayer.name, otherPlayerPos, otherPlayer.headRot);
//         }

//         this.players.push(player);

//         if (this.matchStatus === MatchStatus.RUNNING) {
//             player.isAlive = true;
//             player.sendGameStatus(this.matchStatus);
//             player.sendAlert("Match has started!");
//             player.sendCooldownTime(1);
//         } else {
//             if (this.players.length >= this.arena.minimumPlayerCount) {
//                 this.run();
//                 player.sendAlert("Match has started!");
//             } else {
//                 player.sendGameStatus(this.matchStatus);
//                 player.sendAlert("Match starting soon!");
//             }
//         }
//     }

//     public removePlayer(player: Player) {

//         const playerIndex = this.players.indexOf(player);
//         if (playerIndex > -1) {
//             this.players.splice(playerIndex, 1);
//         }

//         if (this.matchStatus === MatchStatus.RUNNING) {
//             if (this.players.length < this.arena.minimumPlayerCount) {
//                 this.wait();
//             }
//         }

//         for (const otherPlayer of this.players) {
//             otherPlayer.sendConnectedPlayerRemoval(player.id);
//         }
//     }
// }
