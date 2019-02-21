import * as fs from "fs";
import * as path from "path";
import * as request from "request";
import DatabaseHandler from "./DatabaseHandler";

export default class MetricsHandler {

    private static readonly DIRECTORY_NAME = "keys";
    private static readonly FILE_NAME = "recaptcha.json";

    private static readonly INSERTION_INTERVAL = 5000;

    private databaseHandler: DatabaseHandler;

    private secret: string | undefined;

    private metrics: any[];

    constructor(databaseHandler: DatabaseHandler) {
        this.databaseHandler = databaseHandler;

        this.metrics = [];
    }

    public enable() {
        this.getSecret().then((secret: string) => {

            this.secret = secret;

            setInterval(() => {
                if (this.metrics.length) {
                    this.databaseHandler.insertMetrics(this.metrics);
                    this.metrics = [];
                }
            }, MetricsHandler.INSERTION_INTERVAL);
        });
    }

    public receiveMetrics(metric: any) {
        this.verifyToken(metric.token).then((success: boolean) => {
            if (success) {
                delete metric.token;
                this.metrics.push(metric);

            }
        }).catch((err: any) => {
            console.error(err);
        });
    }

    private verifyToken(token: string | undefined): Promise<boolean> {
        return new Promise((resolve, reject) => {
            request.post("https://www.google.com/recaptcha/api/siteverify", {
                form: {
                    secret: this.secret,
                    response: token,
                },
            }, (err: any, response: request.Response, body: string) => {
                if (err) {
                    reject(err);
                } else {
                    const responseData = JSON.parse(body);
                    resolve(responseData.success);
                }
            });
        });
    }

    private getSecret(): Promise<string> {
        return new Promise((resolve, reject) => {
            const filePath = path.join(process.cwd(), MetricsHandler.DIRECTORY_NAME, MetricsHandler.FILE_NAME);
            fs.readFile(filePath, (err: NodeJS.ErrnoException, rawData: Buffer) => {
                if (err) {
                    console.error(err);
                    reject("Error reading file " + MetricsHandler.FILE_NAME);
                }
                let data;
                try {
                    data = JSON.parse(rawData.toString());
                } catch (ex) {
                    console.error(ex);
                    reject("Error parsing content in " + MetricsHandler.FILE_NAME);
                }

                if (process.argv.includes("dev")) {
                    if (data["dev-secret"]) {
                        resolve(data["dev-secret"]);
                    } else {
                        reject("Incorrect data in " + MetricsHandler.FILE_NAME);
                    }
                } else {
                    if (data["prod-secret"]) {
                        resolve(data["prod-secret"]);
                    } else {
                        reject("Incorrect data in " + MetricsHandler.FILE_NAME);
                    }
                }
            });
        });
    }
}
