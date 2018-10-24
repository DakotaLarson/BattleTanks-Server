import {performance} from "perf_hooks";
import ArenaLoader from "./ArenaLoader";
import EventHandler from "./EventHandler";
import PlayerConnector from "./PlayerConnector";
import InfiniteMultiplayerService from "./service/InfiniteMultiplayerService";
import WebSocketServer from "./WebSocketServer";

const wss = new WebSocketServer();
const playerConnector = new PlayerConnector();
const infiniteService = new InfiniteMultiplayerService();

wss.start();
playerConnector.start();

ArenaLoader.loadArenas().then((message) => {
    console.log(message);

    infiniteService.start();
}).catch((message) => {
    console.error(message);
});

let time = performance.now();
setInterval(() => {
    const currentTime = performance.now();
    const delta = (currentTime - time) / 1000;
    time = currentTime;
    EventHandler.callEvent(EventHandler.Event.GAME_TICK, delta);
}, 50);
