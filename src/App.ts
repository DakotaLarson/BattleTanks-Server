import {performance} from "perf_hooks";
import ArenaLoader from "./ArenaLoader";
import MultiplayerService from "./core/MultiplayerService";
import DatabaseHandler from "./DatabaseHandler";
import BotHandler from "./entity/bot/BotHandler";
import EventHandler from "./EventHandler";
import MetricsHandler from "./MetricsHandler";
import PlayerConnector from "./PlayerConnector";
import WebSocketServer from "./WebSocketServer";

const multiplayerService = new MultiplayerService();
const databaseHandler = new DatabaseHandler();
const metricsHandler = new MetricsHandler(databaseHandler);
const playerConnector = new PlayerConnector(databaseHandler);
const wss = new WebSocketServer(databaseHandler, metricsHandler);
const botHandler = new BotHandler();

wss.enable();
playerConnector.start();

ArenaLoader.loadArenas().then((message) => {
    console.log(message);
    databaseHandler.enable().then(() => {
        metricsHandler.enable();
        multiplayerService.enable();
        if (!process.argv.includes("no-bots")) {
            botHandler.enable();
        }
    }).catch((err) => {
        console.error(err);
    });
}).catch((message) => {
    console.error(message);
});

let time = performance.now();
setInterval(() => {
    const currentTime = performance.now();
    const delta = (currentTime - time) / 1000;
    time = currentTime;
    EventHandler.callEvent(EventHandler.Event.GAME_TICK, delta);
    // delta ~ 0.05
}, 50);
// let lastPts = 0;
// let lastDiff = 0;
// const ranks = [
//     "Recruit",
//     "Private",
//     "Corporal",
//     "Sergeant",
//     "Officer",
//     "Lieutenant",
//     "Commander",
//     "Captain",
//     "Major",
//     "Colonel",
//     "General",
// ];
// for (let i = 0; i <= 100; i ++) {
//     // const pts = Math.round(i * Math.log(i) * 10);
//     const pts = Math.round(Math.pow(i, Math.E));
//     const diff = pts - lastPts;
//     const diffOfDiff = diff - lastDiff;
//     lastPts = pts;
//     lastDiff = diff;
//     console.log(pts, diff, diffOfDiff);
//     if (i % 10 === 0) {
//         const rank = ranks[i / 10];
//         console.log(rank, pts);
//     }
// }
