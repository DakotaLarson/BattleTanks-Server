import * as fs from "fs";
import * as mysql from "mysql";
import * as path from "path";
import EventHandler from "./EventHandler";

export default class DatabaseHandler {

    private static readonly DIRECTORY_NAME = "keys";
    private static readonly FILE_NAME = "database.json";

    private static readonly TIMEOUT = 5000;

    private pool: mysql.Pool | undefined;

    public start() {
        return new Promise((resolve) => {
            this.getConnectionData().then((data: any) => {
                let database = data.database;
                if (process.argv.includes("dev")) {
                    database = data["database-dev"];
                }
                this.pool = mysql.createPool({
                    host: data.host,
                    port: data.port,
                    user: data.username,
                    password: data.password,
                    database,
                });

                EventHandler.addListener(this, EventHandler.Event.DB_PLAYER_UPDATE, this.onPlayerUpdate);
                EventHandler.addListener(this, EventHandler.Event.DB_PLAYERS_UPDATE, this.onPlayersUpdate);

                resolve();
            });
        });
    }

    public getPlayerStats(id: string) {
        return new Promise((resolve, reject) => {
            const fields = ["points", "currency", "victories", "defeats", "draws", "shots", "hits", "kills", "deaths"];
            let sql = "SELECT `" + fields[0] + "`";

            for (let i = 1; i < fields.length; i ++) {
                sql += ", `" + fields[i] + "`";
            }

            sql += " FROM `players` WHERE `id` = ?";

            (this.pool as mysql.Pool).query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values: [id],
            }, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    if (results.length !== 1) {
                        resolve({});
                    } else {
                        resolve({
                            points: results[0].points,
                            currency: results[0].currency,
                            victories: results[0].victories,
                            defeats: results[0].defeats,
                            draws: results[0].draws,
                            shots: results[0].shots,
                            hits: results[0].hits,
                            kills: results[0].kills,
                            deaths: results[0].deaths,
                        });
                    }
                }
            });
        });
    }

    public getPlayerUsername(id: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const sql = "SELECT `username` FROM `players` WHERE `id` = ?";

            (this.pool as mysql.Pool).query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values: [id],
            }, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    if (results.length !== 1) {
                        resolve("");
                    } else {
                        resolve(results[0].username);
                    }
                }
            });
        });
    }

    public updatePlayerUsername(id: string, username: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.isUsernameTaken(username).then((isTaken) => {
                if (isTaken) {
                    resolve(false);
                } else {
                    const sql = "UPDATE `players` SET `username` = ? WHERE `id` = ?";
                    (this.pool as mysql.Pool).query({
                        sql,
                        timeout: DatabaseHandler.TIMEOUT,
                        values: [username, id],
                    }, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(true);
                        }
                    });
                }
            });
        });
    }

    public isUsernameTaken(username: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const sql = "SELECT COUNT(*) FROM `players` WHERE `username` = ?";
            (this.pool as mysql.Pool).query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values: [username],
            }, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results[0]["COUNT(*)"] > 0);
                }
            });
        });
    }

    public handlePlayerAuth(data: any) {
        return new Promise((resolve) => {
            this.hasPlayer(data.id).then((hasPlayer) => {
                if (!hasPlayer) {
                    this.getPlayerCount().then((count: number) => {
                        // Player name *should* be unique.
                        this.createPlayer(data.id, data.email, data.name, "Player #" + count).then(() => {
                            resolve();
                        });
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    public getPlayerRank(points: number, column: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = "SELECT COUNT(*) FROM `players` WHERE `" + column + "` > ?";
            (this.pool as mysql.Pool).query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values: [points],
            }, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results[0]["COUNT(*)"] + 1);
                }
            });
        });
    }

    public getLeaderboard(leaderboard: number) {
        return new Promise((resolve, reject) => {
            const page = 1;
            const offset = (page - 1) * 10;

            let column;
            if (leaderboard === 4) {
                column = "points";
            } else {
                column = "leaderboard_points_" + leaderboard;
            }

            const sql = "SELECT `username`, `" + column + "` AS 'points' FROM `players` ORDER BY `" + column + "` DESC LIMIT 10 OFFSET ?";
            (this.pool as mysql.Pool).query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values: [offset],
            }, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
    }

    public getLeaderboardRank(id: string, leaderboard: number) {
        return new Promise((resolve) => {

            let column: any;
            if (leaderboard === 4) {
                column = "points";
            } else {
                column = "leaderboard_points_" + leaderboard;
            }
            this.getPlayerPoints(id, column).then((points) => {
                this.getPlayerRank(points, column).then((rank) => {
                    resolve(rank);
                });
            });
        });
    }

    private onPlayerUpdate(eventData: any) {
        const id = eventData.id;
        const data = eventData.data;

        const fields = ["points", "currency", "victories", "defeats", "shots", "hits", "kills", "deaths", "leaderboard_points_1", "leaderboard_points_2", "leaderboard_points_3"];

        this.getPlayerData(id, fields).then((results: any) => {
            if (results.length === 1) {
                const newData: Map<string, number> = new Map();
                for (const field of fields) {
                    if (data[field]) {
                        newData.set(field, results[0][field] + data[field]);
                    } else {
                        newData.set(field, results[0][field] + data.points);
                    }
                }
                this.updatePlayerData(id, newData);
            } else {
                console.warn("Unexpected number of results on update: " + results.length);
            }

        });
    }

    private onPlayersUpdate(matchData: Map<string, any>) {
        const fields = ["id", "points", "currency", "victories", "defeats", "shots", "hits", "kills", "deaths", "leaderboard_points_1", "leaderboard_points_2", "leaderboard_points_3"];
        const mutableFields = fields.slice(1);
        const ids = [];
        for (const [id] of matchData) {
            ids.push(id);
        }
        if (ids.length) {
            this.getPlayersData(ids, fields).then((results) => {
                const newStats: Map<string, any> = new Map();

                for (const result of results) {
                    const userId = result.id;
                    const userMatchStats = matchData.get(userId);

                    if (userMatchStats) {

                        const newUserStats: any = {};
                        for (const field of Object.keys(userMatchStats)) {
                            newUserStats[field] = userMatchStats[field] + result[field];
                        }
                        newUserStats.leaderboard_points_1 = userMatchStats.points + result.leaderboard_points_1;
                        newUserStats.leaderboard_points_2 = userMatchStats.points + result.leaderboard_points_2;
                        newUserStats.leaderboard_points_3 = userMatchStats.points + result.leaderboard_points_3;

                        newStats.set(userId, newUserStats);
                    }
                }
                this.updatePlayersData(newStats, mutableFields).catch((err: any) => {
                    console.error(err);
                });

            }).catch((err: any) => {
                console.error(err);
            });
        }
    }

    private createPlayer(id: string, email: string, name: string, username: string) {
        return new Promise((resolve, reject) => {
            const sql = "INSERT INTO `players` (`id`, `email`, `name`, `username`, `subscribed`) VALUES (?, ?, ?, ?, ?)";
            (this.pool as mysql.Pool).query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values: [id, email, name, username, false],
            }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    private hasPlayer(id: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const sql = "SELECT COUNT(*) AS count FROM `players` WHERE `id` = ?";
            (this.pool as mysql.Pool).query({
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

    private getPlayersData(ids: string[], fields: string[]): Promise<[any]> {
        return new Promise((resolve, reject) => {
            let fieldString = "`" + fields[0] + "`";
            for (let i = 1; i < fields.length; i ++) {
                fieldString += ", `" + fields[i] + "`";
            }
            const idWildcards = ", ?".repeat(ids.length - 1);
            const sql = "SELECT " + fieldString + " FROM `players` WHERE `id` IN (?" + idWildcards + ")";

            (this.pool as mysql.Pool).query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values: ids,
            }, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
    }

    private getPlayerData(id: string, fields: string[]): Promise<[any]> {
        return new Promise((resolve, reject) => {
            let fieldString = "`" + fields[0] + "`";
            for (let i = 1; i < fields.length; i ++) {
                fieldString += ", `" + fields[i] + "`";
            }
            const sql = "SELECT " + fieldString + " FROM `players` WHERE `id` = ?";

            (this.pool as mysql.Pool).query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values: [id],
            }, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
    }

    private updatePlayersData(userData: Map<string, any>, mutableFields: string[]) {
        return new Promise((resolve, reject) => {
            const values = [];
            let sql = "UPDATE `players` SET";

            // For each field, use CASE/WHEN.
            for (let i = 0; i < mutableFields.length; i ++) {
                const field = mutableFields[i];
                let fieldMutation = "";
                if (i) {
                    fieldMutation += ",";
                }
                fieldMutation += " `" + field + "` = CASE ";
                for (const [id, data] of userData) {
                    fieldMutation += "WHEN `id` = ? THEN ? ";
                    values.push(id, data[field]);
                }
                fieldMutation += "END";
                sql += fieldMutation;
            }

            // Where id field is in list of player Ids.
            sql += " WHERE `id` IN (";
            let hasAddedWildcard = false;
            for (const [id] of userData) {
                if (hasAddedWildcard) {
                    sql += ", ?";
                } else {
                    sql += "?";
                    hasAddedWildcard = true;
                }
                values.push(id);
            }
            sql += ")";

            (this.pool as mysql.Pool).query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values,
            }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    private updatePlayerData(id: string, newData: Map<string, number>) {

        return new Promise((resolve, reject) => {
            let sql = "UPDATE `players` SET";
            const values = [];

            let hasAddedField = false;
            for (const [field, data] of newData) {
                if (hasAddedField) {
                    sql += ", `" + field + "` = ?";
                } else {
                    sql += " `" + field + "` = ?";
                    hasAddedField = true;
                }
                values.push(data);
            }

            sql += " WHERE `id` = ?";
            values.push(id);

            (this.pool as mysql.Pool).query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values,
            }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    private getPlayerPoints(id: string, column: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = "SELECT `" + column + "` FROM `players` WHERE `id` = ?";
            (this.pool as mysql.Pool).query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values: [id],
            }, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results[0][column]);
                }
            });
        });
    }

    private getPlayerCount(): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = "SELECT COUNT(*) FROM `players`";
            (this.pool as mysql.Pool).query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
            }, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results[0]["COUNT(*)"]);
                }
            });
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

                if (data.host && data.port && data.username && data.password && data.database && data["database-dev"]) {
                    resolve(data);
                }
            });
        });
    }
}
