import {performance} from "perf_hooks";
import ArenaLoader from "./ArenaLoader";
import MultiplayerService from "./core/MultiplayerService";
import DatastoreHandler from "./DatastoreHandler";
import BotHandler from "./entity/bot/BotHandler";
import EventHandler from "./EventHandler";
import PlayerConnector from "./PlayerConnector";
import WebSocketServer from "./WebSocketServer";

const wss = new WebSocketServer();
const playerConnector = new PlayerConnector();
const multiplayerService = new MultiplayerService();
const datastoreHandler = new DatastoreHandler();
const botHandler = new BotHandler();

wss.start();
playerConnector.start();

ArenaLoader.loadArenas().then((message) => {
    console.log(message);
    multiplayerService.start();
    datastoreHandler.start();
    botHandler.enable();
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
