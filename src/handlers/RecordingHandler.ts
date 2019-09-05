import * as Ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as ftp from "ftp";
import * as path from "path";
import DatabaseHandler from "../database/DatabaseHandler";

export default class RecordingHandler {

    private static readonly MIN_LENGTH = 5;
    private static readonly MAX_LENGTH = 30;

    private static readonly OVERLAY_PATH = path.join(process.cwd(), "recordings", "res", "header.png");
    private static readonly DESTINATION_PATH = path.join(process.cwd(), "recordings", "processed");

    private static readonly TEMPLATE_PATH = path.join(process.cwd(), "recordings", "res", "template.html");
    private static readonly TEMPLATE_PLACEHOLDER = /\[VIDEO_URL\]/g;

    private static readonly CRED_DIRECTORY_NAME = "keys";
    private static readonly CRED_FILE_NAME = "ftp.json";

    private databaseHandler: DatabaseHandler;

    private connectionData: any;

    constructor(databaseHandler: DatabaseHandler) {
        this.databaseHandler = databaseHandler;

        this.getConnectionData().then((data: any) => {
            this.connectionData = data;
        }).catch(console.error);
    }

    public async handleUpload(id: string, file: Express.Multer.File, body: any) {
        let destination;
        if (id && this.validateBody(body)) {
            const localDetails: any = await this.processVideo(file.filename, file.path, parseInt(body.start, 10), parseInt(body.end, 10));
            destination = await this.uploadContent(localDetails.destination, localDetails.filename);
            await this.databaseHandler.createRecording(id, destination, body.arena);
            await this.deleteFile(file.path, true);
            await this.deleteFile(localDetails.destination, false);
            return true;
        } else {
            await this.deleteFile(file.path, true);
            return false;
        }
    }

    public async getRecordings(id: string) {
        return await this.databaseHandler.getRecordings(id);
    }

    private uploadContent(localDestination: string, fullFilename: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const dotIndex = fullFilename.lastIndexOf(".");
            const filename = fullFilename.substring(0, dotIndex);
            const fileExtension = fullFilename.substring(dotIndex);

            let remoteVideoDestination = "/" + filename + "/video" + fileExtension;
            let remoteHtmlDestination = "/" + filename + "/index.html";
            if (process.argv.includes("dev")) {
                remoteVideoDestination = "/dev" + remoteVideoDestination;
                remoteHtmlDestination = "/dev" + remoteHtmlDestination;
            }

            const templateData = await this.createTemplate("https://battletanks.app/recordings" + remoteVideoDestination);
            const client = new ftp();

            client.on("ready", () => {
                let dir = "/" + filename;
                if (process.argv.includes("dev")) {
                    dir = "/dev" + dir;
                }
                client.mkdir(dir, (mkDirErr: Error) => {
                    if (mkDirErr) {
                        reject(mkDirErr);
                    } else {
                        client.put(localDestination, remoteVideoDestination, (videoErr: Error) => {
                            if (videoErr) {
                                reject(videoErr);
                                client.end();
                            } else {
                                client.put(templateData, remoteHtmlDestination, (htmlErr: Error) => {
                                    client.end();
                                    if (htmlErr) {
                                        reject(htmlErr);
                                    } else {
                                        resolve("https://battletanks.app/recordings" + dir);
                                    }
                                });
                            }
                        });
                    }
                });
            });
            // Required handle to prevent server crash
            client.on("error", console.error);

            client.connect({
                host: this.connectionData.host,
                port: this.connectionData.port,
                user: this.connectionData.username,
                password: this.connectionData.password,
            });
        });
    }

    private processVideo(filename: string, inputPath: string, start: number, end: number) {
        return new Promise((resolve, reject) => {
            const newFilename = filename.replace("webm", "mp4");
            const destination = path.join(RecordingHandler.DESTINATION_PATH, newFilename);
            const ffmpeg: Ffmpeg.FfmpegCommand = Ffmpeg();
            ffmpeg.input("./" + inputPath).setStartTime(start);
            ffmpeg.input(RecordingHandler.OVERLAY_PATH);
            ffmpeg.setDuration(end - start);
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
                        x: "main_w - overlay_w - 10",
                        y: "main_h - overlay_h - 10",
                    },
                    inputs: ["[scl][1:v]"],
                    outputs: "[ovrl]",
                },
                {
                    filter: "pad",
                    options: {
                        width: "1280",
                        height: "720",
                        x: "-1",
                        y: "-1",
                        color: "black",
                    },
                    inputs: "[ovrl]",
                    outputs: "[pd]",
                },
                {
                    filter: "fade",
                    options: {
                        type: "in",
                        start_time: 0,
                        duration: 0.5,
                    },
                    inputs: "[pd]",
                    outputs: "[fdin]",
                },
                {
                    filter: "fade",
                    options: {
                        type: "out",
                        start_time: end - 1,
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
                        start_time: end - 1,
                        duration: 1,
                    },
                    inputs: "[aud]",
                    outputs: "[fdaud]",
                },

            ], ["[fdout]", "[fdaud]"]);

            ffmpeg.on("end", () => {
                resolve({
                    destination,
                    filename: newFilename,
                });
            });
            ffmpeg.on("error", (err, stdout, stderr) => {
                console.error(stderr);
                reject(err);
            });

            ffmpeg.save(destination);
        });
    }

    private deleteFile(filepath: string, isRelative: boolean) {
        return new Promise((resolve, reject) => {
            const pathToDelete = isRelative ? "./" + filepath : filepath;
            fs.unlink(pathToDelete, (err: NodeJS.ErrnoException | null) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    private validateBody(body: any) {
        if (body && body.start && body.end) {
            const start = parseInt(body.start, 10);
            const end = parseInt(body.end, 10);

            if (!isNaN(start) && !isNaN(end) && body.arena) {
                if (start >= 0 && end >= 0) {
                    const length = end - start;
                    if (length >= RecordingHandler.MIN_LENGTH && length <= RecordingHandler.MAX_LENGTH) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private async createTemplate(videoUrl: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            fs.readFile(RecordingHandler.TEMPLATE_PATH, (err, rawData) => {
                if (err) {
                    reject(err);
                } else {
                    const data = rawData.toString();
                    const replaced = data.replace(RecordingHandler.TEMPLATE_PLACEHOLDER, videoUrl);
                    resolve(Buffer.from(replaced));
                }
            });
        });
    }

    private getConnectionData(): Promise<any> {
        return new Promise((resolve, reject) => {

            const filePath = path.join(process.cwd(), RecordingHandler.CRED_DIRECTORY_NAME, RecordingHandler.CRED_FILE_NAME);
            fs.readFile(filePath, (err: NodeJS.ErrnoException | null, rawData: Buffer) => {
                if (err) {
                    console.error(err);
                    reject("Error reading file " + RecordingHandler.CRED_FILE_NAME);
                }

                let data;
                try {
                    data = JSON.parse(rawData.toString());
                } catch (ex) {
                    console.error(ex);
                    reject("Error parsing content in " + RecordingHandler.CRED_FILE_NAME);
                }

                if (data.host && data.port && data.username && data.password) {
                    resolve(data);
                } else {
                    reject("Incorrect data in " + RecordingHandler.CRED_FILE_NAME);
                }
            });
        });
    }
}
