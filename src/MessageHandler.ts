import Auth from "./Auth";
import DatabaseHandler from "./DatabaseHandler";

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
                    });
                }).catch(() => {
                    reject(403);
                });
            }
        });
    }
}
