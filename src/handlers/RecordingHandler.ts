import * as Ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as ftp from "ftp";
import * as path from "path";

export default class RecordingHandler {

    private static readonly MIN_LENGTH = 5;
    private static readonly MAX_LENGTH = 30;

    private static readonly OVERLAY_PATH = path.join(process.cwd(), "recordings", "overlay", "header.png");
    private static readonly DESTINATION_PATH = path.join(process.cwd(), "recordings", "processed");

    private static readonly CRED_DIRECTORY_NAME = "keys";
    private static readonly CRED_FILE_NAME = "ftp.json";

    private connectionData: any;

    constructor() {
        this.getConnectionData().then((data: any) => {
            this.connectionData = data;
        }).catch(console.error);
    }

    public async handleUpload(id: string | undefined, file: Express.Multer.File, body: any) {
        let destination;
        if (id && this.validateBody(body)) {
            const localDetails: any = await this.processVideo(file.filename, file.path, parseInt(body.start, 10), parseInt(body.end, 10));
            destination = await this.uploadVideo(localDetails.destination, localDetails.filename);
            await this.deleteFile(file);
        } else {
            await this.deleteFile(file);
        }
        return destination;
    }

    private uploadVideo(localDestination: string, filename: string) {
        return new Promise((resolve, reject) => {
            let remoteDestination = "/" + filename;
            if (process.argv.includes("dev")) {
                remoteDestination = "/dev/" + filename;
            }
            const client = new ftp();

            client.on("ready", () => {
                client.put(localDestination, remoteDestination, (err: Error) => {
                    client.end();
                    if (err) {
                        reject(err);
                    } else {
                        resolve("https://battletanks.app/recordings" + remoteDestination);
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
            const destination = path.join(RecordingHandler.DESTINATION_PATH, filename);
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
                    filename,
                });
            });
            ffmpeg.on("error", (err, stdout, stderr) => {
                console.error(stderr);
                reject(err);
            });

            ffmpeg.save(destination);
        });
    }

    private async deleteFile(file: Express.Multer.File) {
        return new Promise((resolve, reject) => {
            fs.unlink("./" + file.path, (err: NodeJS.ErrnoException | null) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
                console.log("deleted");
            });
        });
    }

    private validateBody(body: any) {
        if (body && body.start && body.end) {
            const start = parseInt(body.start, 10);
            const end = parseInt(body.end, 10);

            if (!isNaN(start) && !isNaN(end)) {
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
