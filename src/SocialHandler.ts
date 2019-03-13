import Auth from "./Auth";
import DatabaseHandler from "./DatabaseHandler";

export default class SocialHandler {

    private databaseHandler: DatabaseHandler;

    constructor(databaseHandler: DatabaseHandler) {
        this.databaseHandler = databaseHandler;
    }

    public handleFriendUpdate(token: string, username: string, state: number, action: boolean) {
        return new Promise((resolve, reject) => {
            Auth.verifyId(token).then((data: any) => {
                const requestorId = data.id;

                if (state === 0 || state === 1 || state === 2 || state === 3) {
                    this.databaseHandler.getPlayerId(username).then((id) => {
                        if (state === 0) {
                            // send request
                            this.databaseHandler.createFriendship(requestorId, id).then(() => {
                                resolve();
                            }).catch((err) => {
                                console.error(err);
                                reject(500);
                            });
                        } else if (state === 1) {
                            // cancel request
                            this.databaseHandler.deleteFriendship(requestorId, id, true).then(() => {
                                resolve();
                            }).catch((err) => {
                                console.error(err);
                                reject(500);
                            });
                        } else if (state === 2) {
                            if (action) {
                                // accept request
                                this.databaseHandler.updateFriendship(id, requestorId, true).then(() => {
                                    resolve();
                                }).catch((err) => {
                                    console.error(err);
                                    reject(500);
                                });
                            } else {
                                // delete request
                                this.databaseHandler.deleteFriendship(id, requestorId, true).then(() => {
                                    resolve();
                                }).catch((err) => {
                                    console.error(err);
                                    reject(500);
                                });
                            }
                        } else if (state === 3 && !action) {
                            this.databaseHandler.deleteFriendship(id, requestorId, false).then(() => {
                                resolve();
                            }).catch((err) => {
                                console.error(err);
                                reject(500);
                            });
                        } else {
                            reject(400);
                        }
                    }).catch((err) => {
                        console.error(err);
                        reject(500);
                    });
                } else {
                    reject(400);
                }
            }).catch(() => {
                reject(403);
            });
        });
    }

    public getFriendship(token: string, id: string) {
        return new Promise((resolve) => {
            Auth.verifyId(token).then((requestorData) => {
                if (requestorData.id !== id) {
                    this.databaseHandler.getFriendship(requestorData.id, id).then((friendship) => {
                        resolve(friendship);
                    }).catch((err) => {
                        console.error(err);
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    public handlePlayerOptions(body: any) {
        return new Promise((resolve, reject) => {
            Auth.verifyId(body.token).then((data: any) => {
                if ("friends" in body  || "conversations" in body) {
                    this.updatePlayerOptions(data.id, body.friends, body.conversations).then(() => {
                        resolve();
                    }).catch((code: number) => {
                        reject(code);
                    });
                } else {
                    this.getPlayerOptions(data.id).then((options: any) => {
                        resolve(options);
                    }).catch(() => {
                        reject(500);
                    });
                }
            }).catch(() => {
                reject(403);
            });
        });

    }

    private getPlayerOptions(id: string) {
        return new Promise((resolve, reject) => {
            this.databaseHandler.getPlayerSocialOptions(id).then((rawResults: any) => {
                resolve({
                    friends: rawResults.friends ? true : false,
                    conversations: rawResults.conversations ? true : false,
                });
            }).catch((err) => {
                console.error(err);
                reject();
            });
        });
    }

    private updatePlayerOptions(id: string, friends: any, conversations: any) {
        return new Promise((resolve, reject) => {
            if (friends !== undefined || conversations !== undefined) {
                this.databaseHandler.updatePlayerSocialOptions(id, friends, conversations).then(() => {
                    resolve();
                }).catch((err) => {
                    console.error(err);
                    reject(500);
                });
            } else {
                resolve(400);
            }
        });
    }
}
