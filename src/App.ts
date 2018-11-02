import {performance} from "perf_hooks";
import ArenaLoader from "./ArenaLoader";
import EventHandler from "./EventHandler";
import PlayerConnector from "./PlayerConnector";
import TeamEliminationMultiplayerService from "./service/TeamEliminationMultiplayerService";
import WebSocketServer from "./WebSocketServer";

const wss = new WebSocketServer();
const playerConnector = new PlayerConnector();
const teamElmMPService = new TeamEliminationMultiplayerService();
// const infiniteService = new InfiniteMultiplayerService();

wss.start();
playerConnector.start();

ArenaLoader.loadArenas().then((message) => {
    console.log(message);
    teamElmMPService.start();
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
