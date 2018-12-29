import express = require("express");
import http = require("http");
import EventHandler from "./EventHandler";
// import uuid = require("uuid/v4");

const port = process.env.PORT || 8000;

export default class WebServer {

    public server: http.Server;

    private playerCount: number;

    // private sessionIds: string[] = [];

    constructor() {
        const app = express();
        this.server = http.createServer(app);
        this.playerCount = 0;

        app.get("/playercount", this.onGetPlayerCount.bind(this));
        // this.sessionHandler = session({
        //     secret: "$eCuRiTy",
        //     resave: false,
        //     saveUninitialized: false,
        //     cookie: {
        //         httpOnly: true,
        //         secure: false,
        //     },
        // });

        // Middleware
        // app.use(this.sessionHandler);
        // app.use(express.urlencoded({extended: true}));

        // const cssPath = path.join(process.cwd(), "admin/css");
        // app.use(express.static(cssPath));
        // app.use(this.authenticate.bind(this));

        // // Handlers
        // app.get("/", this.onDashboardRequest.bind(this));

        // app.post("/login", this.onPostLogin.bind(this));
        // app.post("/logout", this.onPostLogout.bind(this));
        // app.post("/token", this.onPostToken.bind(this));
    }

    public start() {
        this.server.listen(port);
        EventHandler.addListener(this, EventHandler.Event.PLAYER_JOIN, this.onPlayerJoin);
        EventHandler.addListener(this, EventHandler.Event.PLAYER_LEAVE, this.onPlayerLeave);
    }

    private onGetPlayerCount(req: express.Request, res: express.Response) {
        res.set("Content-Type", "text/plain");
        res.send("" + this.playerCount);
    }

    private onPlayerJoin() {
        this.playerCount ++;
    }

    private onPlayerLeave() {
        this.playerCount --;
    }

    // private onPostToken(req: express.Request, res: express.Response) {
    //     this.oauthClient.verifyIdToken({
    //         idToken: req.body.token,
    //         audience: WebServer.CLIENT_ID,
    //     }).then((ticket) => {
    //         const payload =  ticket.getPayload();
    //         if (payload) {
    //             if (payload.aud === WebServer.CLIENT_ID && (payload.iss === "accounts.google.com" || payload.iss === "https://accounts.google.com")) {
    //                 console.log(payload.sub);
    //                 (req.session as Express.Session).userId = payload.sub;
    //             }
    //         }
    //     });
    //     console.log(req.session);
    //     res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
    //     res.setHeader("Access-Control-Allow-Credentials", "true");
    //     res.sendStatus(200);
    // }

    // private authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
    //     if (req.session && req.session.user && this.isIdValid(req.session.user) || this.isPostRequest(req)) {
    //         // check data
    //         next();
    //     } else {
    //         res.sendFile(path.join(process.cwd(), "/admin/markup/login.html"));
    //     }
    // }

    // private onDashboardRequest(req: express.Request, res: express.Response) {
    //     res.sendFile(path.join(process.cwd(), "/admin/markup/dashboard.html"));

    // }

    // private onPostLogin(req: express.Request, res: express.Response) {
    //     if (req.body && req.body.username && req.body.password) {
    //         const username = req.body.username;
    //         const password = req.body.password;
    //         this.areCredentialsValid(username, password).then(() => {
    //             if (req.session) {
    //                 const id = uuid();
    //                 req.session.user = id;
    //                 this.sessionIds.push(id);
    //                 res.redirect("/");
    //                 return;
    //             } else {
    //                 res.sendFile(path.join(process.cwd(), "/admin/markup/login.html"));
    //             }
    //         }).catch((reason) => {
    //             console.log(reason);
    //             // res.sendFile(path.join(process.cwd(), "/admin/markup/login.html"));
    //             res.redirect("/?error=4");
    //         });
    //     }
    // }

    // private onPostLogout(req: express.Request, res: express.Response) {
    //     if (req.session) {
    //         const id = req.session.uuid;
    //         if (id) {
    //             const index = this.sessionIds.indexOf(id);
    //             if (id > -1) {
    //                 this.sessionIds.splice(index, 1);
    //             }
    //         }
    //         req.session.destroy(() => {
    //             res.redirect("/");
    //         });
    //     }
    // }

    // private isPostRequest(req: express.Request) {
    //     return req.method === "POST";
    // }

    // private isIdValid(id: string) {
    //     return this.sessionIds.indexOf(id) > -1;
    // }

    // private areCredentialsValid(username: string, password: string): Promise<string> {
    //     return new Promise((resolve, reject) => {
    //         const usersFilePath = path.join(process.cwd(), "/admin/users.json");
    //         fs.access(usersFilePath, (accessErr) => {
    //             if (accessErr) {
    //                 reject("Access error: " + accessErr.message);
    //             } else {
    //                 fs.readFile(usersFilePath, (readErr, data) => {
    //                     if (readErr) {
    //                         reject("Read error: " + readErr.message);
    //                     } else {
    //                         let parsedUsers: any;
    //                         try {
    //                             parsedUsers = JSON.parse(data.toString());
    //                         } catch (ex) {
    //                             reject("users.json is not valid: " + ex);
    //                         }
    //                         if (!parsedUsers.enabled) {
    //                             reject("Users not enabled or users.json is invalid.");
    //                         } else {
    //                             if (Array.isArray(parsedUsers.users)) {
    //                                 for (const validUserArr of parsedUsers.users) {
    //                                     if (validUserArr[0] === username && validUserArr[1] === password) {
    //                                         resolve();
    //                                     }
    //                                 }
    //                                 reject("User credentials are invalid");
    //                             } else {
    //                                 reject("Users array invalid in users.json");
    //                             }
    //                         }
    //                     }
    //                 });
    //             }
    //         });
    //     });
    // }
}
