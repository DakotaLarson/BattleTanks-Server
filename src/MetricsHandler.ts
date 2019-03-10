import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as request from "request";
import DatabaseHandler from "./DatabaseHandler";

export default class MetricsHandler {

    private static readonly DIRECTORY_NAME = "keys";
    private static readonly FILE_NAME = "recaptcha.json";

    private static readonly CIPHER_ALGORITHM = "aes-256-cbc";

    private static readonly KEY_LENGTH = 32;
    private static readonly SALT_LENGTH = 32;
    private static readonly SESSION_LENGTH = 64;
    private static readonly IV_LENGTH = 16;

    private databaseHandler: DatabaseHandler;

    private recaptchaSecret: string | undefined;
    private metricKey: Buffer;
    private metricSalt: string;

    constructor(databaseHandler: DatabaseHandler) {
        this.databaseHandler = databaseHandler;

        this.metricKey = crypto.randomBytes(MetricsHandler.KEY_LENGTH);
        this.metricSalt = crypto.randomBytes(MetricsHandler.SALT_LENGTH).toString("hex");
    }

    public enable() {
        this.getSecret().then((secret: string) => {
            this.recaptchaSecret = secret;
        });
    }

    public receiveMetrics(encryptedSession: string, metric: any) {
        const decryptedData = this.decrypt(encryptedSession);
        if (decryptedData && decryptedData.endsWith(this.metricSalt)) {
            const session = decryptedData.substr(0, decryptedData.length - this.metricSalt.length);
            metric.id = session;
            this.databaseHandler.updateMetric(session, metric).then((metrics) => {
                this.databaseHandler.insertMetric(metrics);
            });
        }
    }

    public createNewMetricSession(data: any): Promise<string> {

        return new Promise((resolve, reject) => {
            this.verifyRecaptchaToken(data.token).then((success: boolean) => {
                if (success) {
                    const newSession = crypto.randomBytes(MetricsHandler.SESSION_LENGTH).toString("hex");
                    const encryptedSession = this.encrypt(newSession);
                    if (this.isValidEncryptedSession(data.session)) {
                        const decryptedSession = this.decrypt(data.session);
                        if (decryptedSession && decryptedSession.endsWith(this.metricSalt)) {
                            const oldSession = decryptedSession.substr(0, decryptedSession.length - this.metricSalt.length);

                            this.databaseHandler.updateMetricSession(oldSession, newSession).then(() => {
                                resolve(encryptedSession);
                            }).catch(() => {
                                reject(500);
                            });
                        } else {
                            resolve(encryptedSession);
                        }
                    } else {
                        resolve(encryptedSession);
                    }
                } else {
                    reject(400);
                }
            }).catch((err) => {
                console.error(err);
                reject(500);
            });
        });
    }

    private verifyRecaptchaToken(token: string | undefined): Promise<boolean> {
        return new Promise((resolve, reject) => {
            request.post("https://www.google.com/recaptcha/api/siteverify", {
                form: {
                    secret: this.recaptchaSecret,
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

    private encrypt(data: string) {
        const iv = crypto.randomBytes(MetricsHandler.IV_LENGTH);
        const cipher = crypto.createCipheriv(MetricsHandler.CIPHER_ALGORITHM, this.metricKey, iv);

        const dataBuffer = cipher.update(data);
        const saltBuffer = cipher.update(this.metricSalt);
        const encryptedData = Buffer.concat([dataBuffer, saltBuffer, cipher.final()]);

        return iv.toString("hex") + ":" + encryptedData.toString("hex");
    }

    private decrypt(data: string) {
        const parts = data.split(":");
        const iv = Buffer.from(parts.shift() as string, "hex");
        const encryptedData = Buffer.from(parts.join(":"), "hex");

        const decipher = crypto.createDecipheriv(MetricsHandler.CIPHER_ALGORITHM, this.metricKey, iv);
        let decryptedData = decipher.update(encryptedData);

        let final;
        try {
            final = decipher.final();
        } catch (ex) {
            return undefined;
        }
        decryptedData = Buffer.concat([decryptedData, final]);

        return decryptedData.toString();
    }

    private isValidEncryptedSession(session: string | undefined) {
        return session && session.indexOf(":") === MetricsHandler.IV_LENGTH * 2;
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
