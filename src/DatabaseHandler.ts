import * as fs from "fs";
import * as mysql from "mysql";
import * as path from "path";
import EventHandler from "./EventHandler";

export default class DatabaseHandler {

    private static readonly DIRECTORY_NAME = "keys";
    private static readonly FILE_NAME = "database.json";

    private static readonly TIMEOUT = 30000;

    private host: string | undefined;
    private port: number | undefined;
    private username: string | undefined;
    private password: string | undefined;
    private database: string | undefined;

    public start() {
        return new Promise((resolve, reject) => {
            this.getConnectionData().then((data: any) => {
                this.host = data.host;
                this.port = data.port;
                this.username = data.username;
                this.password = data.password;
                this.database = data.database;

                EventHandler.addListener(this, EventHandler.Event.DB_PLAYER_JOIN, this.onPlayerJoin);
                EventHandler.addListener(this, EventHandler.Event.DB_PLAYER_UPDATE, this.onPlayerUpdate);
                EventHandler.addListener(this, EventHandler.Event.DB_PLAYERS_UPDATE, this.onPlayersUpdate);

                resolve();
            }).catch(reject);
        });
    }

    private onPlayerJoin(data: any) {
        const connection = this.createConnection();
        let username = data.username;
        if (!username) {
            username = "Guest";
        }
        this.hasPlayer(connection, data.id).then((hasPlayer) => {
            if (!hasPlayer) {
                this.createPlayer(connection, data.id, data.email, data.name, "Guest").then(() => {
                    connection.end();
                }).catch((err: any) => {
                    console.log(err);
                    connection.end();
                });
            }
        });
    }

    private onPlayerUpdate(data: any) {
        // const connection = this.createConnection();
    }

    private onPlayersUpdate(data: Map<string, any>) {
        const fields = ["id", "points", "currency", "victories", "defeats", "shots", "hits", "kills", "deaths"];
        const ids = [];
        for (const [id] of data) {
            ids.push(id);
        }
        const connection = this.createConnection();
        this.getPlayersData(connection, ids, fields).then((results) => {
            console.log(results);
        }).catch(console.log);
    }

    private createPlayer(connection: mysql.Connection, id: string, email: string, name: string, username: string) {
        return new Promise((resolve, reject) => {
            const sql = "INSERT INTO `players` (`id`, `email`, `name`, `username`, `points`, `currency`, `shots`, `hits`, `kills`, `deaths`, `victories`, `defeats`, `draws`, `subscribed`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            connection.query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values: [id, email, name, username, 0, 0, 0, 0, 0, 0, 0, 0, 0, false],
            }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    private hasPlayer(connection: mysql.Connection, id: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const sql = "SELECT COUNT(*) AS count FROM `players` WHERE `id` = ?";
            connection.query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values: [id],
            }, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    const dbCount = results[0].count;
                    if (dbCount > 1) {
                        reject ("Multiple users with same Id");
                    }
                    resolve(dbCount === 1);
                }
            });
        });
    }

    private getPlayersData(connection: mysql.Connection, ids: string[], fields: string[]) {
        return new Promise((resolve, reject) => {
            const wildcards = ", ?".repeat(fields.length - 1);
            const idWildcards = ", ?".repeat(ids.length - 1);
            const sql = "SELECT ?" + wildcards + " FROM `players` WHERE `id` IN (?" + idWildcards + ")";
            fields.forEach((value, index, arr) => {
                arr[index] = "`" + value + "`";
            });
            ids.forEach((value, index, arr) => {
                arr[index] = "'" + value + "'";
            });
            const values = fields.concat(ids);
            console.log(values);
            connection.query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values,
            }, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
    }

    private createConnection() {
        return mysql.createConnection({
            host: this.host,
            port: this.port,
            user: this.username,
            password: this.password,
            database: this.database,
        });
    }

    private getConnectionData() {
        return new Promise((resolve, reject) => {
            const filePath = path.join(process.cwd(), DatabaseHandler.DIRECTORY_NAME, DatabaseHandler.FILE_NAME);
            fs.readFile(filePath, (err: NodeJS.ErrnoException, rawData: Buffer) => {
                if (err) {
                    console.error(err);
                    reject("Error reading file " + DatabaseHandler.FILE_NAME);
                }
                let data;
                try {
                    data = JSON.parse(rawData.toString());
                } catch (ex) {
                    console.error(ex);
                    reject("Error parsing content in " + DatabaseHandler.FILE_NAME);
                }

                if (data.host && data.port && data.username && data.password && data.database) {
                    resolve(data);
                }
            });
        });
    }
}
