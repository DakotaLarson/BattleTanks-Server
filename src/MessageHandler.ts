import Auth from "./Auth";
import DatabaseHandler from "./database/DatabaseHandler";
import EventHandler from "./EventHandler";

export default class MessageHandler {

    private static readonly MAX_MESSAGE_LENGTH = 1024;
    private static readonly MESSAGE_LIMIT = 10;

    private databaseHandler: DatabaseHandler;

    constructor(databaseHandler: DatabaseHandler) {
        this.databaseHandler = databaseHandler;
    }

    public addMessage(token: string, username: string, message: string) {

        return new Promise((resolve, reject) => {
            if (!message || message.length > MessageHandler.MAX_MESSAGE_LENGTH) {
                reject(400);
            } else {
                Auth.verifyId(token).then((data) => {
                    const requestorId = data.id;
                    this.databaseHandler.getPlayerId(username).then((id) => {
                        this.databaseHandler.addMessage(requestorId, id, message).then(() => {
                            this.sendNotification(requestorId, id, message);
                            resolve();
                        }).catch((err) => {
                            console.error(err);
                            reject(500);
                        }) ;
                    });
                });
            }
        });
    }

    public getMessages(token: string, username: string, offset: number) {
        return new Promise((resolve, reject) => {
            if (isNaN(offset) || offset < 0) {
                reject(400);
            } else {
                Auth.verifyId(token).then((data) => {
                    const requestorId = data.id;
                    this.databaseHandler.getPlayerId(username).then((id) => {

                        this.databaseHandler.getMessages(requestorId, id, MessageHandler.MESSAGE_LIMIT, offset).then((results) => {
                            resolve(results);
                        }).catch((err) => {
                            console.error(err);
                            reject(500);
                        });
                        EventHandler.callEvent(EventHandler.Event.NOTIFICATION_DELETE, {
                            type: "message",
                            sender: id,
                            receiver: requestorId,
                        });
                    });
                }).catch(() => {
                    reject(403);
                });
            }
        });
    }

    public getConversations(token: string, offset: number) {
        return new Promise((resolve, reject) => {
            if (isNaN(offset) || offset < 0) {
                reject(400);
            } else {
                Auth.verifyId(token).then((data) => {
                    this.databaseHandler.getConversations(data.id, offset).then((results) => {
                        resolve(results);
                    }).catch((err) => {
                        console.error(err);
                        reject(500);
                    });
                }).catch(() => {
                    reject(403);
                });
            }
        });
    }

    private sendNotification(sender: string, receiver: string, message: string) {
        this.databaseHandler.getPlayerUsername(sender).then((username) => {
            const body = JSON.stringify({
                username,
                message,
            });
            EventHandler.callEvent(EventHandler.Event.NOTIFICATION_SEND, {
                type: "message",
                sender,
                receiver,
                body,
            });
        }).catch((err) => {
            console.error(err);
        });
    }
}
