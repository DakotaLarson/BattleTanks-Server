import * as mysql from "mysql";
import EventHandler from "../main/EventHandler";
import DatabaseUtils from "./DatabaseUtils";

export default class SocialDatabaseHandler {

    private static readonly CONVERSATIONS_LENGTH = 5;

    private utils: DatabaseUtils;

    constructor() {
        EventHandler.addListener(this, EventHandler.Event.DB_POOL_UPDATE, this.onPoolUpdate);
        this.utils = new DatabaseUtils();
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
            const receiverResults = await this.utils.query(receiverSQL, [id]);

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
                await this.utils.query(sql, [requestorId, id]);
            } else {
                throw new Error("Invalid frienship quantity");
            }
        }
    }

    public async updateFriendship(requestorId: string, id: string, value: boolean) {
        const sql = "UPDATE `friends` SET `accepted` = ? WHERE `sender` = ? AND `receiver` = ?";
        await this.utils.query(sql, [value, requestorId, id]);
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

        await this.utils.query(sql, values);
    }

    public async blockFriendship(requestorId: string, id: string) {
        await this.deleteFriendship(id, requestorId, true);
        const sql = "INSERT INTO friends (sender, receiver, accepted, blocked) VALUES (?, ?, FALSE, TRUE) ON DUPLICATE KEY UPDATE accepted = FALSE, blocked = TRUE";
        await this.utils.query(sql, [requestorId, id]);
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
        FROM conversations
        INNER JOIN players ON
        (
            (conversations.sender = ? AND conversations.receiver = players.id) OR (conversations.receiver = ? AND conversations.sender = players.id)
        )
        LEFT JOIN messages ON
        (
            messages.creation_date = (SELECT MAX(M.creation_date) FROM messages M WHERE M.conversation = messages.conversation) AND
            messages.conversation = conversations.id
        )
        `;

        return await this.utils.query(sql, [id, id, SocialDatabaseHandler.CONVERSATIONS_LENGTH, offset]);
    }

    public async saveNotification(type: number, sender: string, receiver: string) {
        const sql = "INSERT INTO notifications (type, sender, receiver) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE creation_date = CURRENT_TIMESTAMP()";
        await this.utils.query(sql, [type, sender, receiver]);
    }

    public async deleteNotification(type: number, sender: string, receiver: string) {
        const sql = "DELETE FROM notifications WHERE type = ? AND sender = ? AND receiver = ?";
        await this.utils.query(sql, [type, sender, receiver]);
    }

    public async deleteNotifications(notifications: any[]) {
        if (notifications.length) {

            let sql = "DELETE FROM notifications WHERE (type = ? AND sender = ? AND receiver = ?)";
            const values = [notifications[0].type, notifications[0].sender, notifications[0].receiver];

            for (let i = 1; i < notifications.length; i ++) {
                sql += " OR (type = ? AND sender = ? AND receiver = ?)";
                values.push(notifications[i].type, notifications[i].sender, notifications[i].receiver);
            }

            await this.utils.query(sql, values);
        }
    }

    public async deleteAllNotifications(receiver: string) {
        const sql = "DELETE FROM notifications WHERE receiver = ?";
        await this.utils.query(sql, [receiver]);
    }

    public async getNotifications(receiver: string) {
        const sql = `SELECT notifications.type, players.username
        FROM notifications, players
        WHERE notifications.receiver = ? AND
        notifications.sender = players.id ORDER BY creation_date DESC LIMIT 100`;
        return await this.utils.query(sql, [receiver]);
    }

    public async getPlayerSocialOptions(id: string): Promise<any> {
        const sql = "SELECT `friends`, `conversations` FROM `players` WHERE `id` = ?";
        const results = await this.utils.query(sql, [id]);
        return ({
            friends: results[0].friends,
            conversations: results[0].conversations,
        });
    }

    public async createConversation(sender: string, receiver: string, message?: string) {
        const validationSql = `
            SELECT COUNT(*) FROM conversations
            WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
        `;
        const validationValues = [sender, receiver, receiver, sender];
        const validationResults = await this.utils.query(validationSql, validationValues);

        if (validationResults.length && validationResults[0]["COUNT(*)"] === 0) {
            const sql = "INSERT INTO `conversations` (`sender`, `receiver`) VALUES (?, ?)";
            const results = await this.utils.query(sql, [sender, receiver]);

            if (message) {
                const conversationId = results.insertId;
                await this.createMessage(conversationId, true, message);
            }
        }
    }

    private async createMessage(conversation: string, toReceiver: boolean, message: string) {
        const sql = "INSERT INTO `messages` (`conversation`, `to_receiver`, `body`) VALUES (?, ?, ?)";
        await this.utils.query(sql, [conversation, toReceiver, message]);
    }

    private async getConversation(requestorId: string, id: string) {
        const sql = "SELECT `id`, `sender` FROM `conversations` WHERE (`receiver` = ? AND `sender` = ?) OR (`receiver` = ? AND `sender` = ?)";
        const results = await this.utils.query(sql, [requestorId, id, id, requestorId]);
        if (results.length > 1) {
            throw new Error("Multiple conversations found!");
        } else {
            return results;
        }
    }

    private async getConversationMessages(conversation: string, limit: number, offset: number) {
        const sql = "SELECT `body`, `to_receiver` FROM `messages` WHERE `conversation` = ? ORDER BY `creation_date` DESC LIMIT ? OFFSET ?";
        return await this.utils.query(sql, [conversation, limit, offset]);
    }

    private async getFriendshipData(requestorId: string, id: string) {
        const sql = "SELECT accepted, sender, blocked FROM friends where (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)";
        const results = await this.utils.query(sql, [requestorId, id, id, requestorId]);
        if (results.length > 1) {
            throw new Error("Multiple friendships found. or error");
        } else {
            return results;
        }
    }

    private onPoolUpdate(pool: mysql.Pool) {
        this.utils.setPool(pool);
    }
}
