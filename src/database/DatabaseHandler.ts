import * as crypto from "crypto";
import * as fs from "fs";
import * as mysql from "mysql";
import * as path from "path";
import EventHandler from "../EventHandler";
import RankCalculator from "../RankCalculator";

export default class DatabaseHandler {

    public static readonly TIMEOUT = 5000;

    private static readonly DIRECTORY_NAME = "keys";
    private static readonly FILE_NAME = "database.json";

    private static readonly LEADERBOARD_LENGTH = 10;
    private static readonly CONVERSATIONS_LENGTH = 5;

    private pool: mysql.Pool | undefined;

    private lastReset: Map<number, number>;

    private metricFields: Map<string, string>;

    constructor() {
        this.lastReset = new Map([
            [1, 0],
            [2, 0],
            [3, 0],
        ]);

        this.metricFields = new Map([

            ["session_time", "sessionTime"],
            ["game_time", "gameTime"],
            ["match_count", "matchCount"],
        ]);
    }

    public async enable() {
        const data = await this.getConnectionData();
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
        EventHandler.callEvent(EventHandler.Event.DB_POOL_UPDATE, this.pool);

        EventHandler.addListener(this, EventHandler.Event.DB_PLAYER_UPDATE, this.onPlayerUpdate);
        EventHandler.addListener(this, EventHandler.Event.DB_PLAYERS_UPDATE, this.onPlayersUpdate);

        this.scheduleLeaderboardReset();
        this.setAllOffline();
    }

    public async getPlayerStats(id: string, additionalColumns?: boolean) {
        const fields = ["points", "currency", "victories", "defeats", "draws", "shots", "hits", "kills", "deaths"];

        if (additionalColumns) {
            fields.push("first_seen", "last_seen", "online", "play_time");
        }
        let sql = "SELECT `" + fields[0] + "`";

        for (let i = 1; i < fields.length; i ++) {
            sql += ", `" + fields[i] + "`";
        }

        sql += " FROM `players` WHERE `id` = ?";

        const results = await this.query(sql, [id]);

        if (results.length !== 1) {
            return {};
        } else {
            const parsedData: any = {
                points: results[0].points,
                currency: results[0].currency,
                victories: results[0].victories,
                defeats: results[0].defeats,
                draws: results[0].draws,
                shots: results[0].shots,
                hits: results[0].hits,
                kills: results[0].kills,
                deaths: results[0].deaths,
            };
            if (additionalColumns) {
                parsedData.first_seen = results[0].first_seen;
                parsedData.last_seen = results[0].last_seen;
                parsedData.online = results[0].online;
                parsedData.play_time = results[0].play_time;
            }
            return parsedData;
        }
    }

    public async getPlayerUsername(id: string) {
        const sql = "SELECT `username` FROM `players` WHERE `id` = ?";

        const results = await this.query(sql, [id]);

        if (results.length !== 1) {
            return "";
        } else {
            return results[0].username;
        }
    }

    public async getPlayerUsernameAndPoints(id: string) {
        return await this.getPlayerPointsAndName(id, "points");
    }

    public async getPlayerId(username: string): Promise<string> {
        const sql = "SELECT `id` FROM `players` WHERE `username` = ?";

        const results = await this.query(sql, [username]);
        if (results.length !== 1) {
            return "";
        } else {
            return results[0].id;
        }
    }

    public async updatePlayerUsername(id: string, username: string): Promise<boolean> {
        const isTaken = await this.isUsernameTaken(username);
        if (isTaken) {
            return false;
        } else {
            const sql = "UPDATE `players` SET `username` = ? WHERE `id` = ?";
            await this.query(sql, [username, id]);
            return true;
        }
    }

    public async isUsernameTaken(username: string): Promise<boolean> {
        const sql = "SELECT COUNT(*) FROM `players` WHERE `username` = ?";
        const results = await this.query(sql, [username]);
        return results[0]["COUNT(*)"] > 0;
    }

    public async getPlayerSocialOptions(id: string): Promise<any> {
        const sql = "SELECT `friends`, `conversations` FROM `players` WHERE `id` = ?";
        const results = await this.query(sql, [id]);
        return ({
            friends: results[0].friends,
            conversations: results[0].conversations,
        });
    }

    // Either friends or conversations is guaranteed.
    public async updatePlayerSocialOptions(id: string, friends: any, conversations: any) {
        let sql = "UPDATE `players` SET";
        const values = [];
        if (friends !== undefined && conversations !== undefined) {
            sql += " `friends` = ?, `conversations` = ?";
            values.push(friends, conversations);
        } else {
            if (friends !== undefined) {
                sql += " `friends` = ?";
                values.push(friends);
            }
            if (conversations !== undefined) {
                sql += " `conversations = ?";
                values.push(conversations);
            }
        }
        sql += " WHERE `id` = ?";
        values.push(id);
        await this.query(sql, values);
    }

    public async handlePlayerAuth(data: any) {
        const hasPlayer = await this.hasPlayer(data.id);
        if (!hasPlayer) {
            const count = await this.getPlayerCount();
            // Player name *should* be unique.
            await this.createPlayer(data.id, data.email, data.name, "Player #" + count);
        }
        return !hasPlayer;
    }

    public async getPlayerRank(points: number, column: string): Promise<number> {
        const sql = "SELECT COUNT(*) FROM `players` WHERE `" + column + "` > ?";
        const results = await this.query(sql, [points]);
        return results[0]["COUNT(*)"] + 1;
    }

    public async getLeaderboard(columnNumber: number) {
        const page = 1;
        const offset = (page - 1) * DatabaseHandler.LEADERBOARD_LENGTH;

        let column;
        if (columnNumber === 3) {
            column = "points";
        } else {
            column = "leaderboard_points_" + columnNumber;
        }

        const sql = "SELECT `id`, `username`, `" + column + "` AS 'points' FROM `players` WHERE `" + column + "` != 0 ORDER BY `" + column + "` DESC LIMIT ? OFFSET ?";
        const leaderboard = await this.query(sql, [DatabaseHandler.LEADERBOARD_LENGTH, offset]);

        for (const entry of leaderboard) {
            const hash = crypto.createHash("sha256");
            hash.update(entry.id);
            entry.id = hash.digest("hex");
        }

        return {
            leaderboard,
            lastReset: this.lastReset.get(columnNumber),
        };
    }

    public async getLeaderboardRank(id: string, leaderboard: number) {

        let column: any;
        if (leaderboard === 3) {
            column = "points";
        } else {
            column = "leaderboard_points_" + leaderboard;
        }
        const data = await this.getPlayerPointsAndName(id, column);
        const rank = await this.getPlayerRank(data.points, column);

        const hash = crypto.createHash("sha256");
        hash.update(id);

        return {
            rank,
            points: data.points,
            username: data.username,
            id: hash.digest("hex"),
        };

    }

    public async updateMetric(id: string, metric: any): Promise<any> {

        const sql = "SELECT `id`, `session_time`, `game_time`, `match_count`, `fps`, `latency` FROM `metrics` WHERE `id` = ?";
        const results = await this.query(sql, [id]);

        for (const result of results) {
            metric.sessionTime += result.session_time;
            metric.gameTime += result.game_time;
            metric.matchCount += result.match_count;
            metric.fps = Math.round((metric.fps + result.fps) / 2);
            metric.latency = Math.round((metric.latency + result.latency) / 2);
        }

        return metric;
    }

    public async insertMetric(metric: any) {
        const dbFields = ["id", "browser", "os", "device", "session_time", "game_time", "match_count", "audio", "authenticated", "visits", "fps", "latency", "referrer"];
        const values: any[] = [];
        let sql = "INSERT INTO `metrics` ( `" + dbFields[0] + "`";

        for (let i = 1; i < dbFields.length; i ++) {
            sql += ", `" + dbFields[i] + "`";
        }

        sql += ") VALUES (?";

        for (let i = 1; i < dbFields.length; i ++) {
            sql += ", ?";
        }
        sql += ")";

        for (const dbField of dbFields) {
            const dataField = this.metricFields.get(dbField) || dbField;
            values.push(metric[dataField]);
        }

        sql += " ON DUPLICATE KEY UPDATE";

        for (let i = 0; i < dbFields.length; i ++) {
            const field = dbFields[i];
            const seperator = i === dbFields.length - 1 ? "" : ", ";

            sql += " `" + field + "` = VALUES(`" + field + "`)" + seperator;
        }

        await(this.query(sql, values));
    }

    public async updateMetricSession(oldSession: string, newSession: string) {
        const sql = "UPDATE `metrics` SET `id` = ? WHERE `id` = ?";
        await this.query(sql, [newSession, oldSession]);
    }

    public async getSearchResults(query: string, id?: string, friends?: boolean) {
        let sql;
        const values = [];
        if (friends) {
            sql = "SELECT `id`, `username`, `points` FROM `players` INNER JOIN `friends` ON ((`friends`.`sender` = `players`.`id` AND `friends`.`receiver` = ?) OR (`friends`.`receiver` = `players`.`id` AND `friends`.`sender` = ?)) AND `friends`.`accepted` = TRUE WHERE `username` LIKE ? ORDER BY `points` DESC LIMIT 10";
            values.push(id, id, "%" + query + "%", DatabaseHandler.LEADERBOARD_LENGTH);
        } else {
            sql = "SELECT `id`, `username`, `points` FROM `players` WHERE `username` LIKE ? ORDER BY `points` DESC LIMIT ? ";
            values.push("%" + query + "%", DatabaseHandler.LEADERBOARD_LENGTH);
        }
        const results = await this.query(sql, values);

        const data = [];
        for (const result of results) {
            if (id && result.id === id) {
                data.push({
                    username: result.username,
                    points: result.points,
                    isPlayer: true,
                });
            } else {
                data.push({
                    username: result.username,
                    points: result.points,
                });
            }
        }
        return data;
    }

    public async setOnline(id: string, online: boolean) {
        const sql = "UPDATE `players` SET `online` = ?, `last_seen` = CURRENT_TIMESTAMP() WHERE `id` = ?";
        await this.query(sql, [online, id]);
    }

    public async addPlayTime(id: string, time: number) {
        let sql = "SELECT play_time FROM players WHERE id = ?";
        const results = await this.query(sql, [id]);

        const playTime = results[0].play_time + time;
        sql = "UPDATE players SET play_time = ? WHERE id = ?";
        await this.query(sql, [playTime, id]);
    }

    /*
    friends:
    0: Unblock - enabled
    1: Add Friend - disabled
    2: Add Friend - enabled
    3: Request Sent - disabled
    4: Accept Request - enabled
    5: Friends! - disabled (with addl class)

    conversations:
    0: send message disabled,
    1: send message enabled

    negative:
    0: hidden
    1: Block,
    2; Cancel Request,
    3: Delete Request,
    4: Unfriend,
    */
    public async getFriendship(requestorId: string, id: string): Promise<any> {
        const friendshipResults = await this.getFriendshipData(requestorId, id);
        const friendship = {
            friends: 0,
            conversations: 0,
            negative: 0,
        };
        // Are they friends?
        if (friendshipResults.length === 1 && (friendshipResults[0].accepted || friendshipResults[0].blocked)) {

            if (friendshipResults[0].blocked) {
                // Blocked; no access to conversation or negative elt
                friendship.conversations = 0;
                friendship.negative = 0;
                if (friendshipResults[0].sender === requestorId) {
                    // player has option to unblock
                    friendship.friends = 0;
                } else {
                    // player has no option to unblock
                    friendship.friends = 1;
                }
            } else {
                // players are friends
                friendship.friends = 5;
                friendship.conversations = 1;
                friendship.negative = 4;
            }

            return friendship;
        } else {
            const receiverSQL = "SELECT `friends`, `conversations` FROM `players` WHERE `id` = ?";
            const receiverResults = await this.query(receiverSQL, [id]);

            // compute friends
            if (friendshipResults.length === 1) {
                // request in progress
                if (friendshipResults[0].sender === requestorId) {
                    // Requestor is initiator of request
                    friendship.friends = 3;
                    friendship.negative = 2;
                } else {
                    // Requestor is receiver of request
                    friendship.friends = 4;
                    friendship.negative = 3;
                }
            } else {
                // request not in progress
                if (receiverResults[0].friends) {
                    // Receiver accepts requests
                    friendship.friends = 2;
                    friendship.negative = 1;
                } else {
                    // Receiver doesn't accept requests
                    friendship.friends = 1;
                    friendship.negative = 1;
                }
            }
            // compute conversations
            if (receiverResults[0].conversations) {
                // receiver accepts conversations from everyone
                friendship.conversations = 1;
            } else {
                // receiver does not accept conversations from everyone
                friendship.conversations = 0;
            }
            return friendship;
        }
    }

    public async createFriendship(requestorId: string, id: string) {
        const socialOptions = await this.getPlayerSocialOptions(id);
        if (socialOptions.friends) {
            const friendshipData = await this.getFriendshipData(requestorId, id);
            if (!friendshipData.length) {
                const sql = "INSERT INTO `friends` (`sender`, `receiver`) VALUES (?, ?)";
                await this.query(sql, [requestorId, id]);
            } else {
                throw new Error("Invalid frienship quantity");
            }
        }
    }

    public async updateFriendship(requestorId: string, id: string, value: boolean) {
        const sql = "UPDATE `friends` SET `accepted` = ? WHERE `sender` = ? AND `receiver` = ?";
        await this.query(sql, [value, requestorId, id]);
    }

    public async deleteFriendship(requestorId: string, id: string, directionKnown: boolean) {
        let sql;
        const values = [requestorId, id];

        if (directionKnown) {
            sql = "DELETE FROM `friends` WHERE `sender` = ? AND `receiver` = ?";
        } else {
            sql = "DELETE FROM `friends` WHERE (`sender` = ? AND `receiver` = ?) OR (`sender` = ? AND `receiver` = ?)";
            values.push(id, requestorId);
        }

        await this.query(sql, values);
    }

    public async blockFriendship(requestorId: string, id: string) {
        await this.deleteFriendship(id, requestorId, true);
        const sql = "INSERT INTO friends (sender, receiver, accepted, blocked) VALUES (?, ?, FALSE, TRUE) ON DUPLICATE KEY UPDATE accepted = FALSE, blocked = TRUE";
        await this.query(sql, [requestorId, id]);
    }

    public async addMessage(requestorId: string, id: string, message: string): Promise<void> {
        const results = await this.getConversation(requestorId, id);
        if (results.length) {
            const toReceiver = results[0].sender === requestorId;
            await this.createMessage(results[0].id, toReceiver, message);
        } else {
            await this.createConversation(requestorId, id, message);
        }
    }

    public async getMessages(requestorId: string, id: string, limit: number, offset: number) {
        const conversationResults = await this.getConversation(requestorId, id);

        if (conversationResults.length) {
            const messageResults = await this.getConversationMessages(conversationResults[0].id, limit, offset);

            const parsedResults = [];
            for (const result of messageResults) {
                let sent;
                if (conversationResults[0].sender === requestorId) {
                    sent = result.to_receiver ? true : false;
                } else {
                    sent = result.to_receiver ? false : true;
                }

                parsedResults.push({
                    body: result.body,
                    sent,
                });
            }
            return parsedResults;
        } else {
            return [];
        }
    }

    public async getConversations(id: string, offset: number): Promise<any> {
        const sql = `SELECT messages.body, players.username
        FROM messages, players, conversations
        WHERE
        (
            (conversations.sender = ? AND conversations.receiver = players.id) OR (conversations.receiver = ? AND conversations.sender = players.id)
        ) AND
        messages.creation_date = (SELECT MAX(M.creation_date) FROM messages M WHERE M.conversation = messages.conversation) AND
        messages.conversation = conversations.id
        ORDER BY messages.creation_date DESC LIMIT ? OFFSET ?`;
        return await this.query(sql, [id, id, DatabaseHandler.CONVERSATIONS_LENGTH, offset]);
    }

    public async saveNotification(type: number, sender: string, receiver: string) {
        const sql = "INSERT INTO notifications (type, sender, receiver) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE creation_date = CURRENT_TIMESTAMP()";
        await this.query(sql, [type, sender, receiver]);
    }

    public async deleteNotification(type: number, sender: string, receiver: string) {
        const sql = "DELETE FROM notifications WHERE type = ? AND sender = ? AND receiver = ?";
        await this.query(sql, [type, sender, receiver]);
    }

    public async deleteNotifications(notifications: any[]) {
        if (notifications.length) {

            let sql = "DELETE FROM notifications WHERE (type = ? AND sender = ? AND receiver = ?)";
            const values = [notifications[0].type, notifications[0].sender, notifications[0].receiver];

            for (let i = 1; i < notifications.length; i ++) {
                sql += " OR (type = ? AND sender = ? AND receiver = ?)";
                values.push(notifications[i].type, notifications[i].sender, notifications[i].receiver);
            }

            await this.query(sql, values);
        }
    }

    public async deleteAllNotifications(receiver: string) {
        const sql = "DELETE FROM notifications WHERE receiver = ?";
        await this.query(sql, [receiver]);
    }

    public async getNotifications(receiver: string) {
        const sql = `SELECT notifications.type, players.username
        FROM notifications, players
        WHERE notifications.receiver = ? AND
        notifications.sender = players.id ORDER BY creation_date DESC LIMIT 100`;
        return await this.query(sql, [receiver]);
    }

    private async createConversation(sender: string, receiver: string, message: string) {
        const sql = "INSERT INTO `conversations` (`sender`, `receiver`) VALUES (?, ?)";
        const results = await this.query(sql, [sender, receiver]);

        const conversationId = results.insertId;
        await this.createMessage(conversationId, true, message);
    }

    private async createMessage(conversation: string, toReceiver: boolean, message: string) {
        const sql = "INSERT INTO `messages` (`conversation`, `to_receiver`, `body`) VALUES (?, ?, ?)";
        await this.query(sql, [conversation, toReceiver, message]);
    }

    private async getConversation(requestorId: string, id: string) {
        const sql = "SELECT `id`, `sender` FROM `conversations` WHERE (`receiver` = ? AND `sender` = ?) OR (`receiver` = ? AND `sender` = ?)";
        const results = await this.query(sql, [requestorId, id, id, requestorId]);
        if (results.length > 1) {
            throw new Error("Multiple conversations found!");
        } else {
            return results;
        }
    }

    private async getConversationMessages(conversation: string, limit: number, offset: number) {
        const sql = "SELECT `body`, `to_receiver` FROM `messages` WHERE `conversation` = ? ORDER BY `creation_date` DESC LIMIT ? OFFSET ?";
        return await this.query(sql, [conversation, limit, offset]);
    }

    private async getFriendshipData(requestorId: string, id: string) {
        const sql = "SELECT accepted, sender, blocked FROM friends where (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)";
        const results = await this.query(sql, [requestorId, id, id, requestorId]);
        if (results.length > 1) {
            throw new Error("Multiple friendships found. or error");
        } else {
            return results;
        }
    }

    private async onPlayerUpdate(eventData: any) {
        const id = eventData.id;
        const data = eventData.data;

        const fields = ["points", "currency", "victories", "defeats", "shots", "hits", "kills", "deaths", "leaderboard_points_1", "leaderboard_points_2"];

        const results = await this.getPlayerData(id, fields);
        if (results.length === 1) {
            const newData: Map<string, number> = new Map();
            for (const field of fields) {
                if (data[field]) {
                    newData.set(field, results[0][field] + data[field]);
                } else {
                    // set leaderboard fields
                    newData.set(field, results[0][field] + data.points);
                }
            }

            // TODO: Handle this in a separate process when implementation complexity is reduced.
            RankCalculator.handlePointChange(id, results[0].username, results[0].points, data.points);

            this.updatePlayerData(id, newData);
        } else {
            throw new Error("Unexpected number of results on update: " + results.length);
        }
    }

    private async onPlayersUpdate(matchData: Map<string, any>) {
        const fields = ["id", "points", "currency", "victories", "defeats", "shots", "hits", "kills", "deaths", "leaderboard_points_1", "leaderboard_points_2"];
        const mutableFields = fields.slice(1);
        const ids = [];
        for (const [id] of matchData) {
            ids.push(id);
        }
        if (ids.length) {
            const results = await this.getPlayersData(ids, fields);
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

                    newStats.set(userId, newUserStats);

                    // TODO: Handle this in a separate process when implementation complexity is reduced.
                    RankCalculator.handlePointChange(userId, result.username, result.points, userMatchStats.points);
                }
            }
            this.updatePlayersData(newStats, mutableFields);
        }
    }

    private async createPlayer(id: string, email: string, name: string, username: string) {
        const sql = "INSERT INTO `players` (`id`, `email`, `name`, `username`, `subscribed`) VALUES (?, ?, ?, ?, ?)";
        await this.query(sql, [id, email, name, username, false]);
    }

    private async hasPlayer(id: string) {
        const sql = "SELECT COUNT(*) AS count FROM `players` WHERE `id` = ?";
        const results = await this.query(sql, [id]);

        const dbCount = results[0].count;
        if (dbCount > 1) {
            throw new Error("Multiple users with same Id");
        }
        return dbCount === 1;
    }

    private async getPlayersData(ids: string[], fields: string[]) {
        let fieldString = "`username`";
        for (const field of fields) {
            fieldString += ", `" + field + "`";
        }
        const idWildcards = ", ?".repeat(ids.length - 1);
        const sql = "SELECT " + fieldString + " FROM `players` WHERE `id` IN (?" + idWildcards + ")";

        return await this.query(sql, ids);
    }

    private async getPlayerData(id: string, fields: string[]) {
        let fieldString = "`username`";
        for (const field of fields) {
            fieldString += ", `" + field + "`";
        }
        const sql = "SELECT " + fieldString + " FROM `players` WHERE `id` = ?";

        return await this.query(sql, [id]);
    }

    private async updatePlayersData(userData: Map<string, any>, mutableFields: string[]) {
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

        await this.query(sql, values);
    }

    private async updatePlayerData(id: string, newData: Map<string, number>) {

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

        await this.query(sql, values);
    }

    private async getPlayerPointsAndName(id: string, column: string) {
        const sql = "SELECT `" + column + "`, `username` FROM `players` WHERE `id` = ?";
        const results = await this.query(sql, [id]);

        if (results.length !== 1) {
            throw new Error("Unexpected result quantity:"  + results.length);
        } else {
            return {
                points: results[0][column],
                username: results[0].username,
            };
        }
    }

    private async getPlayerCount() {
        const sql = "SELECT COUNT(*) FROM `players`";
        const results = await this.query(sql);

        return results[0]["COUNT(*)"];
    }

    private scheduleLeaderboardReset() {
        const now = new Date();
        const resetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const resetTime = resetDate.getTime() - now.getTime();
        setTimeout(() => {
            if (resetDate.getDay() === 1) {
                this.resetLeaderboard(1);
            }
            if (resetDate.getDate() === 1) {
                this.resetLeaderboard(2);
            }
            this.scheduleLeaderboardReset();
        }, resetTime);
    }

    private async resetLeaderboard(columnNumber: number) {
        const results = await this.getLeaderboard(columnNumber);
        const canUpdateLeaderboard = results.leaderboard.length === DatabaseHandler.LEADERBOARD_LENGTH;

        if (canUpdateLeaderboard) {

            const column = "leaderboard_points_" + columnNumber;
            const sql = "UPDATE `players` SET " + column + " = 0";
            try {
                await this.query(sql);
                this.lastReset.set(columnNumber, 0);
                console.log("Leaderboard reset: " + columnNumber);
            } catch (ex) {
                const lastColumnReset = (this.lastReset.get(columnNumber) as number);
                this.lastReset.set(columnNumber, lastColumnReset + 1);
            }
        } else {
            const lastColumnReset = (this.lastReset.get(columnNumber) as number);
            this.lastReset.set(columnNumber, lastColumnReset + 1);
            console.log("Leaderboard not reset: " + columnNumber);
        }
    }

    private async setAllOffline() {
        const sql = "UPDATE `players` SET `online` = 0";
        await this.query(sql);
    }

    private query(sql: string, values?: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            this.pool!.query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values,
            }, (err, results) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                resolve(results);
            });
        });
    }

    private getConnectionData(): Promise<any> {
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
                } else {
                    reject("Incorrect data in " + DatabaseHandler.FILE_NAME);
                }
            });
        });
    }
}
