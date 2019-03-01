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

wss.start();
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
