import express = require("express");
import DatabaseHandler from "./database/DatabaseHandler";
import EventHandler from "./EventHandler";

export default class NotificationHandler {

    private static readonly NOTIFICATION_INTERVAL = 30000;

    private static readonly NOTIFICATION_TYPES = [
        "message",
        "friend_request",
        "friend_accept",
        "level_up",
        "rank_up",
    ];

    private static readonly SAVABLE_NOTIFICATION_TYPES = [
        "message",
        "friend_request",
        "friend_accept",
    ];

    private databaseHandler: DatabaseHandler;

    private notificationListeners: Map<string, express.Response>;

    constructor(databaseHandler: DatabaseHandler) {
        this.databaseHandler = databaseHandler;

        this.notificationListeners = new Map();

    }

    public enable() {
        this.sendNotificationHeartbeat();
        EventHandler.addListener(this, EventHandler.Event.NOTIFICATION_SEND, this.onNotificationSend);
        EventHandler.addListener(this, EventHandler.Event.NOTIFICATION_GLOBAL_SEND, this.onGlobalSend);
        EventHandler.addListener(this, EventHandler.Event.NOTIFICATION_DELETE, this.onNotificationDelete);
        EventHandler.addListener(this, EventHandler.Event.NOTIFICATION_DELETE_MULTIPLE, this.onNotificationDeleteMultiple);
    }

    public addPlayer(id: string, res: express.Response) {
        this.databaseHandler.setOnline(id, true);
        this.notificationListeners.set(id, res);
        this.sendNotifications(id, res);
    }

    public removePlayer(id: string) {
        this.databaseHandler.setOnline(id, false);
        this.notificationListeners.delete(id);
    }

    // separate process wants to send
    private onNotificationSend(data: any) {
        const type = NotificationHandler.NOTIFICATION_TYPES.indexOf(data.type);
        if (type > -1) {
            const res = this.notificationListeners.get(data.receiver);
            if (res) {
                this.sendNotification(res, [{
                    type,
                    body: data.body,
                }]);
            } else if (NotificationHandler.SAVABLE_NOTIFICATION_TYPES.indexOf(data.type) > -1) {
                this.databaseHandler.saveNotification(type, data.sender, data.receiver).catch((err) => {
                    console.error(err);
                });
            }
        }
    }

    private onGlobalSend(data: any) {
        const type = NotificationHandler.NOTIFICATION_TYPES.indexOf(data.type);
        for (const [, res] of this.notificationListeners) {
            this.sendNotification(res, [{
                type,
                body: data.body,
            }]);
        }
    }

    // Separate process deletes
    private onNotificationDelete(data: any) {
        const type = NotificationHandler.NOTIFICATION_TYPES.indexOf(data.type);
        if (type > -1) {
            this.databaseHandler.deleteNotification(type, data.sender, data.receiver);
        }
    }

    private onNotificationDeleteMultiple(data: any[]) {
        const parsedNotifications = [];
        for (const notification of data) {
            const type = NotificationHandler.NOTIFICATION_TYPES.indexOf(notification.type);
            if (type > -1) {
                parsedNotifications.push({
                    type,
                    sender: notification.sender,
                    receiver: notification.receiver,
                });
            }
        }
        this.databaseHandler.deleteNotifications(parsedNotifications);
    }

    // Internal when player joins
    private async sendNotifications(receiver: string, res: express.Response) {
        try {
            const results = await this.databaseHandler.getNotifications(receiver);
            this.sendNotification(res, results);
        } catch (ex) {
            return;
        }
    }

    // Send raw data
    private sendNotification(res: express.Response, data: any[]) {
        const rawData = JSON.stringify(data);
        res.write("data: " + rawData + "\n\n");
    }

    // Keep connections alive
    private sendNotificationHeartbeat() {
        setInterval(() => {
            for (const [, res] of this.notificationListeners) {
                this.sendNotification(res, []);
            }
        }, NotificationHandler.NOTIFICATION_INTERVAL);
    }
}
