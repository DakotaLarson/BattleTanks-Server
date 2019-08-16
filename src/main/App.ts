import {performance} from "perf_hooks";
import ArenaLoader from "../arena/ArenaLoader";
import MultiplayerService from "../core/MultiplayerService";
import DatabaseHandler from "../database/DatabaseHandler";
import SocialDatabaseHandler from "../database/SocialDatabaseHandler";
import BotHandler from "../entity/bot/BotHandler";
import MetricsHandler from "../handlers/MetricsHandler";
import ReferralHandler from "../handlers/ReferralHandler";
import StoreHandler from "../handlers/StoreHandler";
import PlayerConnector from "../network/PlayerConnector";
import WebSocketServer from "../network/WebSocketServer";
import EventHandler from "./EventHandler";
import PlayerTimer from "./PlayerTimer";

const multiplayerService = new MultiplayerService();

const databaseHandler = new DatabaseHandler();
const socialDatabaseHandler = new SocialDatabaseHandler();

const storeHandler = new StoreHandler();
const metricsHandler = new MetricsHandler(databaseHandler);
const playerConnector = new PlayerConnector(databaseHandler, storeHandler);
const referralHandler = new ReferralHandler();
const wss = new WebSocketServer(databaseHandler, socialDatabaseHandler, metricsHandler, storeHandler, referralHandler);
const botHandler = new BotHandler();
const playerTimer = new PlayerTimer(databaseHandler, referralHandler);

wss.enable();
playerConnector.enable();

ArenaLoader.loadArenas().then((message) => {
    console.log(message);
    databaseHandler.enable().then(() => {
        metricsHandler.enable();
        multiplayerService.enable();
        playerTimer.enable();
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
