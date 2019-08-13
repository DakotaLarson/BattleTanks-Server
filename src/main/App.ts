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

// BEGIN FFMPEG CODE
import * as Ffmpeg from "fluent-ffmpeg";
import * as path from "path";

const ffmpeg: Ffmpeg.FfmpegCommand = Ffmpeg();
ffmpeg.input(path.join(process.cwd(), "recordings", "raw", "test.webm")).setStartTime(5);
ffmpeg.input(path.join(process.cwd(), "recordings", "overlay", "header.png"));
ffmpeg.setDuration(10);
ffmpeg.fps(30);
ffmpeg.complexFilter([
    {
        filter: "scale",
        options: {
            width: "1280",
            height: "720",
            force_original_aspect_ratio: "decrease",
        },
        inputs: "[0:v]",
        outputs: "[scl]",
    },
    {
        filter: "overlay",
        options: {
            // x: 1920 / 2 - 720 / 2,
            // y: 1080 - 25,
            x: "main_w - overlay_w - 10",
            y: "main_h - overlay_h - 10",
        },
        inputs: ["[scl][1:v]"],
        outputs: "[ovrl]",
    },
    {
        filter: "fade",
        options: {
            type: "in",
            start_time: 0,
            duration: 0.5,
        },
        inputs: "[ovrl]",
        outputs: "[fdin]",
    },
    {
        filter: "fade",
        options: {
            type: "out",
            start_time: 9,
            duration: 0.5,
        },
        inputs: "[fdin]",
        outputs: "[fdout]",
    },
    {
        filter: "afade",
        options: {
            type: "in",
            start_time: 0,
            duration: 0.5,
        },
        inputs: "[0:a]",
        outputs: "[aud]",
    },
    {
        filter: "afade",
        options: {
            type: "out",
            start_time: 9,
            duration: 1,
        },
        inputs: "[aud]",
        outputs: "[fdaud]",
    },

], ["[fdout]", "[fdaud]"]);

ffmpeg.on("end", () => {
    console.log("complete");
});
ffmpeg.on("error", (err, stdout, stderr) => {
    console.log(err);
    console.log("out" + stdout);
    console.log("err" + stderr);
});

ffmpeg.save(path.join(process.cwd(), "recordings", "processed", "test.webm"));
