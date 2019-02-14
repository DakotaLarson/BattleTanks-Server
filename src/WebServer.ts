import bodyParser = require("body-parser");
import cors = require("cors");
import express = require("express");
import http = require("http");
import Auth from "./Auth";
import DatabaseHandler from "./DatabaseHandler";
import EventHandler from "./EventHandler";

const port = process.env.PORT || 8000;

export default class WebServer {

    private static SSE_INTERVAL = 1000;

    private static readonly MINIMUM_USERNAME_LENGTH = 3;
    private static readonly MAXIMUM_USERNAME_LENGTH = 16;

    public server: http.Server;

    private databaseHandler: DatabaseHandler;

    private playerCount: number;
    private botCount: number;

    private inboundCount: number;
    private outboundCount: number;

    private lastSecondInbound: number;
    private lastSecondOutbound: number;

    private subscribers: express.Response[];

    constructor(databaseHandler: DatabaseHandler) {
        const app = express();
        this.server = http.createServer(app);

        this.databaseHandler = databaseHandler;

        this.playerCount = 0;
        this.botCount = 0;

        this.inboundCount = 0;
        this.outboundCount = 0;

        this.lastSecondInbound = 0;
        this.lastSecondOutbound = 0;

        this.subscribers = [];

        app.use(cors());
        // app.use(bodyParser.urlencoded({extended: false}));
        app.use(bodyParser.json());

        app.get("/serverstats", this.onGetServerStats.bind(this));
        app.post("/playerauth", this.onPostPlayerAuth.bind(this));
        app.post("/playerstats", this.onPostPlayerStats.bind(this));
        app.post("/playerusername", this.onPostPlayerName.bind(this));
        app.post("/leaderboard", this.onPostLeaderboard.bind(this));
        app.post("/leaderboardrank", this.onPostLeaderboardRank.bind(this));
        app.get("/playercount", this.onGetPlayerCount.bind(this));
    }

    public start() {
        this.server.listen(port);

        EventHandler.addListener(this, EventHandler.Event.PLAYER_JOIN, this.onPlayerJoin);
        EventHandler.addListener(this, EventHandler.Event.PLAYER_LEAVE, this.onPlayerLeave);
        EventHandler.addListener(this, EventHandler.Event.BOTS_QUANTITY_UPDATE, this.onBotsQuantityUpdate);
        EventHandler.addListener(this, EventHandler.Event.DATA_INBOUND, this.onDataInbound);
        EventHandler.addListener(this, EventHandler.Event.DATA_OUTBOUND, this.onDataOutbound);

        setInterval(() => {
            this.lastSecondInbound = this.inboundCount;
            this.lastSecondOutbound = this.outboundCount;

            this.inboundCount = 0;
            this.outboundCount = 0;
        }, 1000);
        this.sendPlayerCount();
    }

    private onGetServerStats(req: express.Request, res: express.Response) {
        res.set("Content-Type", "application/json");
        const data = {
            players: this.playerCount,
            outbound: this.lastSecondOutbound,
            inbound: this.lastSecondInbound,
            subscribers: this.subscribers.length,
            bots: this.botCount,
            memory: this.getMemoryString(),
        };
        res.send(JSON.stringify(data));
    }

    private onPostPlayerAuth(req: express.Request, res: express.Response) {
        if (req.body && req.body.token) {
            Auth.verifyId(req.body.token).then((data: any) => {

                this.databaseHandler.handlePlayerAuth(data).then(() => {
                    res.sendStatus(200);
                }).catch((err) => {
                    console.error(err);
                    res.sendStatus(500);
                });
            }).catch(() => {
                res.sendStatus(403);
            });
        }
    }

    private onPostPlayerStats(req: express.Request, res: express.Response) {
        if (req.body && req.body.token) {
            Auth.verifyId(req.body.token).then((data: any) => {
                this.databaseHandler.getPlayerStats(data.id).then((stats: any) => {
                    this.databaseHandler.getPlayerRank(stats.points, "points").then((rank: number ) => {
                        stats.rank = rank;
                        res.status(200).set({
                            "content-type": "application/json",
                        });
                        res.send(JSON.stringify(stats));
                    }).catch((err) => {
                        console.error(err);
                        res.sendStatus(500);
                    });
                }).catch((err) => {
                    console.error(err);
                    res.sendStatus(500);
                });
            }).catch(() => {
                res.sendStatus(403);
            });
        } else {
            res.sendStatus(403);
        }
    }

    private onPostPlayerName(req: express.Request, res: express.Response) {
        if (req.body && req.body.token) {
            Auth.verifyId(req.body.token).then((data: any) => {
                let newUsername = req.body.username;
                const isUpdate = req.body.isUpdate;
                if (newUsername) {
                    newUsername = newUsername.trim();
                    if (this.isNameInvalid(newUsername)) {
                        res.sendStatus(403);
                    } else {
                        if (isUpdate) {
                            this.databaseHandler.updatePlayerUsername(data.id, newUsername).then((status) => {
                                res.status(200).set({
                                    "content-type": "text/plain",
                                });
                                res.send(status);
                            }).catch((err: any) => {
                                console.error(err);
                                res.sendStatus(500);
                            });
                        } else {
                            this.databaseHandler.isUsernameTaken(newUsername).then((status) => {
                                res.status(200).set({
                                    "content-type": "text/plain",
                                });
                                res.send(status);
                            }).catch((err: any) => {
                                console.error(err);
                                res.sendStatus(500);
                            });
                        }
                    }
                } else {
                    this.databaseHandler.getPlayerUsername(data.id).then((name: string) => {
                        res.status(200).set({
                            "content-type": "text/plain",
                        });
                        res.send(name);
                    }).catch((err: any) => {
                        console.error(err);
                        res.sendStatus(500);
                    });
                }
            }).catch(() => {
                res.sendStatus(403);
            });
        } else {
            res.sendStatus(403);
        }
    }

    private onPostLeaderboard(req: express.Request, res: express.Response) {
        const validLeaderboards = [1, 2, 3];
        if (req.body && validLeaderboards.includes(req.body.leaderboard)) {
            this.databaseHandler.getLeaderboard(req.body.leaderboard).then((data) => {
                res.status(200).set({
                    "content-type": "application/json",
                });
                res.send(data);
            }).catch((err: any) => {
                console.error(err);
                res.sendStatus(500);
            });
        }
    }

    private onPostLeaderboardRank(req: express.Request, res: express.Response) {
        const validLeaderboards = [1, 2, 3];
        if (req.body && req.body.token && validLeaderboards.includes(req.body.leaderboard)) {
            Auth.verifyId(req.body.token).then((data: any) => {
                this.databaseHandler.getLeaderboardRank(data.id, req.body.leaderboard).then((rank) => {
                    res.status(200).set({
                        "content-type": "text/plain",
                    });
                    res.send("" + rank);
                });
            });
        }
    }

    private onGetPlayerCount(req: express.Request, res: express.Response) {
        req.on("close", () => {
            if (this.subscribers.includes(res)) {
                this.subscribers.splice(this.subscribers.indexOf(res), 1);
            }
        });
        res.setTimeout(0);
        res.status(200).set({
            "cache-control": "no-cache",
            "content-type": "text/event-stream",
            "access-control-allow-origin": "*",
        });
        this.subscribers.push(res);
        this.sendPlayerCountData(res, this.playerCount + this.botCount, this.subscribers.length);
    }

    private onPlayerJoin() {
        this.playerCount ++;
    }

    private onPlayerLeave() {
        this.playerCount --;
    }

    private onBotsQuantityUpdate(quantity: number) {
        this.botCount = quantity;
    }

    private onDataInbound(length: number) {
        this.inboundCount += length;
    }

    private onDataOutbound(length: number) {
        this.outboundCount += length;
    }

    private sendPlayerCount() {

        let lastPlayerCount = this.playerCount + this.botCount;
        let lastActiveUserCount = this.subscribers.length;
        setInterval(() => {
            const currentPlayerCount = this.playerCount + this.botCount;
            const currentActiveUserCount = this.subscribers.length;
            if (currentActiveUserCount && (currentPlayerCount !== lastPlayerCount || currentActiveUserCount !== lastActiveUserCount)) {
                this.sendDataToSubscribers(currentPlayerCount, currentActiveUserCount);
                lastPlayerCount = currentPlayerCount;
                lastActiveUserCount = currentActiveUserCount;
            }
        }, WebServer.SSE_INTERVAL);
    }

    private sendDataToSubscribers(playerCount: number, activeUserCount: number) {
        for (const res of this.subscribers) {
            this.sendPlayerCountData(res, playerCount, activeUserCount);
        }
    }

    private sendPlayerCountData(res: express.Response, playerCount: number, activeUserCount: number) {
        res.write("data: " + playerCount + "," + activeUserCount + "\n\n");
    }

    private getMemoryString() {
        const memoryUsage = process.memoryUsage();
        const total = memoryUsage.heapTotal;
        const used = memoryUsage.heapUsed;
        const percentage = Math.round(used / total * 100) + "%";
        return used + " / " + total + " (" + percentage + ")";
    }

    private isNameInvalid(name: string) {
        return name.length < WebServer.MINIMUM_USERNAME_LENGTH || name.length > WebServer.MAXIMUM_USERNAME_LENGTH || name.toLowerCase().startsWith("guest") || name.toLowerCase().startsWith("player");
    }
}
