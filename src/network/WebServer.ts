import bodyParser = require("body-parser");
import cors = require("cors");
import crypto = require("crypto");
import express = require("express");
import http = require("http");
import multer = require("multer");
import DatabaseHandler from "../database/DatabaseHandler";
import SocialDatabaseHandler from "../database/SocialDatabaseHandler";
import MessageHandler from "../handlers/MessageHandler";
import MetricsHandler from "../handlers/MetricsHandler";
import NotificationHandler from "../handlers/NotificationHandler";
import RecordingHandler from "../handlers/RecordingHandler";
import ReferralHandler from "../handlers/ReferralHandler";
import SocialHandler from "../handlers/SocialHandler";
import StoreHandler from "../handlers/StoreHandler";
import Auth from "../main/Auth";
import EventHandler from "../main/EventHandler";

export default class WebServer {

    private static readonly SSE_INTERVAL = 1000;
    private static readonly MAX_SSE_INTERVAL = 30;
    private static readonly PORT = process.env.PORT || 8000;

    private static readonly MINIMUM_USERNAME_LENGTH = 3;
    private static readonly MAXIMUM_USERNAME_LENGTH = 16;

    public server: http.Server;

    private databaseHandler: DatabaseHandler;

    private socialHandler: SocialHandler;
    private messageHandler: MessageHandler;
    private metricsHandler: MetricsHandler;
    private notificationHandler: NotificationHandler;
    private storeHandler: StoreHandler;
    private referralHandler: ReferralHandler;
    private recordingHandler: RecordingHandler;

    private playerCount: number;
    private botCount: number;

    private inboundCount: number;
    private outboundCount: number;

    private lastSecondInbound: number;
    private lastSecondOutbound: number;

    private subscribers: express.Response[];

    constructor(databaseHandler: DatabaseHandler, socialDatabaseHandler: SocialDatabaseHandler, metricsHandler: MetricsHandler, storeHandler: StoreHandler, referralHandler: ReferralHandler) {
        const app = express();
        this.server = http.createServer(app);

        this.databaseHandler = databaseHandler;

        this.socialHandler = new SocialHandler(databaseHandler, socialDatabaseHandler);
        this.messageHandler = new MessageHandler(databaseHandler, socialDatabaseHandler);
        this.metricsHandler = metricsHandler;
        this.notificationHandler = new NotificationHandler(databaseHandler, socialDatabaseHandler);
        this.storeHandler = storeHandler;
        this.referralHandler = referralHandler;
        this.recordingHandler = new RecordingHandler(databaseHandler);

        this.playerCount = 0;
        this.botCount = 0;

        this.inboundCount = 0;
        this.outboundCount  = 0;

        this.lastSecondInbound = 0;
        this.lastSecondOutbound = 0;

        this.subscribers = [];

        app.use(cors());

        const storage = multer.diskStorage({
            destination: "recordings/raw/",
            filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
                const name =  crypto.pseudoRandomBytes(4).toString("hex") + Date.now() + ".webm";
                // tslint:disable-next-line: no-null-keyword
                cb(null, name);
            },
        });
        const upload = multer({
            storage,
            fileFilter: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
                // tslint:disable-next-line: no-null-keyword
                cb(null, file.mimetype === "video/webm");
            },
            limits: {
                files: 1,
                fileSize: 100 * 1024 * 1024,
            },
        });

        app.use(bodyParser.json());
        app.use(bodyParser.text());
        app.use(upload.single("recording"));
        // app.use(bodyParser.urlencoded({extended: false}));

        app.get("/serverstats", this.onGetServerStats.bind(this));
        app.post("/playerauth", this.onPostPlayerAuth.bind(this));
        app.post("/playerstats", this.onPostPlayerStats.bind(this));
        app.post("/playerusername", this.onPostPlayerName.bind(this));
        app.post("/playersocialoptions", this.onPostPlayerSocialOptions.bind(this));
        app.post("/leaderboard", this.onPostLeaderboard.bind(this));
        app.post("/leaderboardrank", this.onPostLeaderboardRank.bind(this));
        app.get("/playercount", this.onGetPlayerCount.bind(this));
        app.get("/notification", this.onGetNotification.bind(this));
        app.post("/metrics", this.onPostMetrics.bind(this));
        app.post("/metricsession", this.onPostMetricSession.bind(this));
        app.post("/profile", this.onPostProfile.bind(this));
        app.post("/search", this.onPostSearch.bind(this));
        app.post("/friend", this.onPostFriend.bind(this));
        app.post("/messages", this.onPostMessages.bind(this));
        app.post("/conversations", this.onPostConversations.bind(this));
        app.post("/store", this.onPostStore.bind(this));
        app.post("/selection", this.onPostSelection.bind(this));
        app.post("/referral", this.onPostReferral.bind(this));
        app.post("/recordings", this.onPostRecordings.bind(this));
        app.post("/payment" , this.onPostPayment.bind(this));
        app.get("/", (req: express.Request, res: express.Response) => {
            res.send("You are probably looking for https://battletanks.app");
        });
    }

    public enable() {
        this.server.listen(WebServer.PORT);

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
        this.notificationHandler.enable();
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
        res.send(data);
    }

    private async onPostPlayerAuth(req: express.Request, res: express.Response) {
        try {
            const data = await this.verifyToken(req);
            if (data) {
                const isNew = await this.databaseHandler.handlePlayerAuth(data);
                if (isNew) {
                    await this.storeHandler.initPlayer(data.id);
                    await this.referralHandler.initPlayer(data.id);
                }
                res.sendStatus(200);
            } else {
                res.sendStatus(403);
            }
        } catch (ex) {
            console.log(ex);
            res.sendStatus(500);
        }
    }

    private async onPostPlayerStats(req: express.Request, res: express.Response) {
        try {
            const data = await this.verifyToken(req);
            if (data) {
                const stats = await this.databaseHandler.getPlayerStats(data.id);
                const rank = await this.databaseHandler.getPlayerRank(stats.points, "points");
                stats.rank = rank;
                res.status(200).set({
                    "content-type": "application/json",
                });
                res.send(stats);
            } else {
                res.sendStatus(403);
            }
        } catch (ex) {
            console.error(ex);
            res.sendStatus(500);
        }
    }

    private async onPostPlayerName(req: express.Request, res: express.Response) {
        const data = await this.verifyToken(req);
        if (data) {
            try {
                let newUsername = req.body.username;
                const isUpdate = req.body.isUpdate;
                if (newUsername) {
                    newUsername = newUsername.trim();
                    if (this.isNameInvalid(newUsername)) {
                        res.sendStatus(403);
                    } else {
                        if (isUpdate) {
                            const status = await this.databaseHandler.updatePlayerUsername(data.id, newUsername);
                            res.status(200).set({
                                "content-type": "text/plain",
                            });
                            res.send(status);
                        } else {
                            const status = await this.databaseHandler.isUsernameTaken(newUsername);
                            res.status(200).set({
                                "content-type": "text/plain",
                            });
                            res.send(status);
                        }
                    }
                } else {
                    const name = await this.databaseHandler.getPlayerUsername(data.id);
                    res.status(200).set({
                        "content-type": "text/plain",
                    });
                    res.send(name);
                }
            } catch (ex) {
                console.error(ex);
                res.sendStatus(500);
            }
        } else {
            res.sendStatus(403);
        }
    }

    private onPostPlayerSocialOptions(req: express.Request, res: express.Response) {
        if (req.body && req.body.token) {
            this.socialHandler.handlePlayerOptions(req.body).then((options: any) => {
                res.status(200).set({
                    "content-type": "application/json",
                });
                if (options) {
                    res.send(options);
                } else {
                    res.end();
                }
            }).catch((code: number) => {
                res.sendStatus(code);
            });
        } else {
            res.sendStatus(403);
        }
    }

    private async onPostLeaderboard(req: express.Request, res: express.Response) {
        const validLeaderboards = [1, 2, 3];
        if (req.body && validLeaderboards.includes(req.body.leaderboard)) {
            try {
                const data = await this.databaseHandler.getLeaderboard(req.body.leaderboard);
                res.status(200).set({
                    "content-type": "application/json",
                });
                res.send(data);
            } catch (ex) {
                console.error(ex);
                res.sendStatus(500);
            }
        } else {
            res.sendStatus(403);
        }
    }

    private async onPostLeaderboardRank(req: express.Request, res: express.Response) {
        const validLeaderboards = [1, 2, 3];
        if (validLeaderboards.includes(req.body.leaderboard)) {
            const data = await this.verifyToken(req);
            if (data) {
                try {
                    const rankData = await this.databaseHandler.getLeaderboardRank(data.id, req.body.leaderboard);
                    res.status(200).set({
                        "content-type": "application/json",
                    });
                    res.send(rankData);
                } catch (ex) {
                    console.error(ex);
                    res.sendStatus(500);
                }
            } else {
                res.sendStatus(403);
            }
        } else {
            res.sendStatus(403);
        }
    }

    private onGetPlayerCount(req: express.Request, res: express.Response) {
        req.on("close", () => {
            const index = this.subscribers.indexOf(res);
            if (index > -1) {
                this.subscribers.splice(index, 1);
            }
        });
        res.setTimeout(0);
        res.status(200).set({
            "cache-control": "no-cache",
            "content-type": "text/event-stream",
            "connection": "keep-alive",
            "access-control-allow-origin": "*",
        });
        this.subscribers.push(res);
        this.sendPlayerCountData(res, this.playerCount + this.botCount, this.subscribers.length);
    }

    private onGetNotification(req: express.Request, res: express.Response) {
        if (req.query && req.query.token) {
            Auth.verifyId(req.query.token).then((data: any) => {
                const id = data.id;
                req.on("close", () => {
                    this.notificationHandler.removePlayer(id);
                });
                res.setTimeout(0);
                res.status(200).set({
                    "cache-control": "no-cache",
                    "content-type": "text/event-stream",
                    "connection": "keep-alive",
                    "access-control-allow-origin": "*",
                });
                this.notificationHandler.addPlayer(id, res);
            }).catch(() => {
                res.sendStatus(403);
            });
        } else {
            res.sendStatus(400);
        }

    }

    private onPostMetrics(req: express.Request, res: express.Response) {
        try {
            const data = JSON.parse(req.body);
            if (data.session && data.metric) {
                this.metricsHandler.receiveMetrics(data.session, data.metric);
            }
            res.end();
        } catch (ex) {
            console.log("invalid metrics posted");
        }
    }

    private onPostMetricSession(req: express.Request, res: express.Response) {
        if (req.body && req.body.token) {
            this.metricsHandler.createNewMetricSession(req.body).then((session) => {
                res.status(200).set({
                    "content-type": "text/plain",
                });
                res.send(session);
            }).catch((code) => {
                res.sendStatus(code);
            });
        }
    }

    private async onPostProfile(req: express.Request, res: express.Response) {
        if (req.body && req.body.username) {
            try {
                const id = await this.databaseHandler.getPlayerId(req.body.username);
                const stats = await this.databaseHandler.getPlayerStats(id, true);

                const rank = await this.databaseHandler.getPlayerRank(stats.points, "points");
                stats.rank = rank;

                if (req.body.token) {
                    try {
                        const friendship = await this.socialHandler.getFriendship(req.body.token, id);
                        stats.friendship = friendship;
                    } finally {
                        res.status(200).set({
                            "content-type": "application/json",
                        });
                        res.send(stats);
                    }
                } else {
                    res.status(200).set({
                        "content-type": "application/json",
                    });
                    res.send(stats);
                }
            } catch (ex) {
                console.error(ex);
                res.sendStatus(500);
            }
        } else {
            res.sendStatus(400);
        }
    }

    private onPostSearch(req: express.Request, res: express.Response) {
        if (req.body && req.body.query) {
            if (req.body.token) {
                Auth.verifyId(req.body.token).then((data: any) => {
                    this.getSearchResults(res, req.body.query, data.id, req.body.friends);
                }).catch(() => {
                    this.getSearchResults(res, req.body.query);
                });
            } else {
                this.getSearchResults(res, req.body.query);
            }
        } else {
            res.sendStatus(400);
        }
    }

    private onPostFriend(req: express.Request, res: express.Response) {
        if (req.body && "token" in req.body && "username" in req.body && "action" in req.body) {
            this.socialHandler.handleFriendUpdate(req.body.token, req.body.username, req.body.action).then((friendship) => {
                res.status(200).send(friendship);
            }).catch((code: number) => {
                res.sendStatus(code);
            });
        } else {
            res.sendStatus(400);
        }
    }

    private onPostMessages(req: express.Request, res: express.Response) {
        if (req.body && "token" in req.body && "username" in req.body) {
            if ("message" in req.body) {
                this.messageHandler.addMessage(req.body.token, req.body.username, req.body.message).then(() => {
                    res.sendStatus(200);
                }).catch((code) => {
                    res.sendStatus(code);
                });
            } else {
                let offset = 0;
                if ("offset" in req.body) {
                    offset = req.body.offset;
                }
                this.messageHandler.getMessages(req.body.token, req.body.username, offset).then((messages) => {
                    res.status(200).set({
                        "content-type": "application/json",
                    });
                    res.send(messages);
                }).catch((code) => {
                    res.sendStatus(code);
                });
            }
        } else {
            res.sendStatus(400);
        }
    }

    private onPostConversations(req: express.Request, res: express.Response) {
        if (req.body && "token" in req.body && "offset" in req.body) {
            this.messageHandler.getConversations(req.body.token, req.body.offset).then((conversations) => {

                res.status(200).set({
                    "content-type": "application/json",
                });
                res.send(conversations);

            }).catch((status) => {
                res.sendStatus(status);
            });
        } else {
            res.sendStatus(400);
        }
    }

    private async onPostStore(req: express.Request, res: express.Response) {
        try {

            let result: any;
            if (req.body && "token" in req.body) {
                const data = await Auth.verifyId(req.body.token);
                result = await this.storeHandler.handleRequest(req.body, data.id);
            } else {
                result = await this.storeHandler.handleRequest(req.body);
            }

            if (result.data) {

                res.status(result.status).set({
                    "content-type": "application/json",
                });
                res.send(result.data);

            } else {
                res.sendStatus(result.status);
            }

        } catch (ex) {
            console.error(ex);
            res.sendStatus(500);
        }

    }

    private async onPostSelection(req: express.Request, res: express.Response) {
        if (req.body && "token" in req.body) {
            try {
                const data = await Auth.verifyId(req.body.token);
                const result = await this.storeHandler.getPlayerCurrentSelection(data.id);
                res.status(200).send(result);
            } catch (ex) {
                console.error(ex);
                res.sendStatus(500);
            }
        } else {
            res.sendStatus(400);
        }
    }

    private async onPostReferral(req: express.Request, res: express.Response) {
        if (req.body && "token" in req.body) {
            try {
                const data = await Auth.verifyId(req.body.token);

                let results = {};
                let status = 400;

                if ("code" in req.body) {
                    const username = await this.databaseHandler.getPlayerUsername(data.id);
                    const success = await this.referralHandler.setReferredFrom(data.id, req.body.code, username);
                    if (success) {
                        status = 200;
                        results = {
                            success: true,
                        };
                    } else {
                        results = {
                            success: false,
                        };
                    }
                } else {
                    const referralResults = await this.referralHandler.getReferralData(data.id);
                    if (referralResults) {
                        status = 200;
                        results = referralResults;
                    }
                }

                res.status(status).set({
                    "content-type": "application/json",
                });
                res.send(results);
            } catch (ex) {
                console.error(ex);
                res.sendStatus(500);
            }
        } else {
            res.sendStatus(403);
        }
    }

    private async onPostRecordings(req: express.Request, res: express.Response) {
        try {
            if (req.body && "token" in req.body) {
                const data = await Auth.verifyId(req.body.token);

                if (req.file) {
                    res.status(200);
                    res.write("processing");
                    let success;
                    try {
                        success = await this.recordingHandler.handleUpload(data.id, req.file, req.body);
                    } catch (err) {
                        console.error(err);
                        success = false;
                    }
                    if (success) {
                        res.write("success");
                    } else {
                        res.write("failure");
                    }
                    res.end();
                } else {
                    const recordings = await this.recordingHandler.getRecordings(data.id);
                    res.status(200).send(recordings);
                }
            } else {
                res.sendStatus(403);
            }

        } catch (err) {
            console.error(err);
            res.sendStatus(500);
        }
    }

    private async onPostPayment(req: express.Request, res: express.Response) {
        if (req.body && "token" in req.body && "payment" in req.body) {
            try {
                const data = await Auth.verifyId(req.body.token);
                const results = await this.storeHandler.getPaymentDetails(data.id, req.body.payment);
                res.status(200).send(results);
            } catch (err) {
                console.error(err);
                res.sendStatus(500);
            }
        } else {
            res.sendStatus(403);
        }
    }

    private getSearchResults(res: express.Response, query: string, id?: string, friends?: boolean) {
        this.databaseHandler.getSearchResults(query, id, friends).then((results: any) => {

            res.status(200).set({
                "content-type": "application/json",
            });
            res.send(results);

        }).catch((err) => {
            console.error(err);
            res.sendStatus(500);
        });
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
        let lastSendTime = 0;

        setInterval(() => {
            const currentPlayerCount = this.playerCount + this.botCount;
            const currentActiveUserCount = this.subscribers.length;

            if (currentActiveUserCount && (lastSendTime >= WebServer.MAX_SSE_INTERVAL || currentPlayerCount !== lastPlayerCount || currentActiveUserCount !== lastActiveUserCount)) {

                this.sendDataToSubscribers(currentPlayerCount, currentActiveUserCount);

                lastPlayerCount = currentPlayerCount;
                lastActiveUserCount = currentActiveUserCount;
                lastSendTime = 0;

            } else {

                if (currentActiveUserCount) {
                    lastSendTime ++;
                } else {
                    lastSendTime = 0;
                }

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
        return name.length < WebServer.MINIMUM_USERNAME_LENGTH || name.length > WebServer.MAXIMUM_USERNAME_LENGTH || name.toLowerCase().startsWith("player");
    }

    private async verifyToken(req: express.Request) {
        if (req.body && req.body.token) {
            try {
                return await Auth.verifyId(req.body.token);
            } catch (ex) {
                return undefined;
            }
        } else {
            return undefined;
        }
    }
}
