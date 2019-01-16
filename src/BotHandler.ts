import Bot from "./Bot";
import EventHandler from "./EventHandler";
import TeamEliminationLobby from "./lobby/TeamEliminationLobby";
import PlayerConnector from "./PlayerConnector";

export default class BotHandler {

    private static readonly LOW_BOT_QUANTITY = 3;
    private static readonly HIGH_BOT_QUANITY = 5;

    private botQuantity: number;

    private bots: Bot[];

    constructor() {
        this.botQuantity = 0;
        this.bots = [];
    }

    public start() {
        EventHandler.addListener(this, EventHandler.Event.LOBBY_CREATION, this.onLobbyCreation);
        EventHandler.addListener(this, EventHandler.Event.LOBBY_GAME_NO_PLAYERS_REMAINING, this.onNoPlayersRemaining);
        this.updateBotQuantity();
    }

    private onLobbyCreation() {
        for (let i = 0; i < this.botQuantity; i ++) {
            this.createBot();
        }
    }

    private onNoPlayersRemaining(lobby: TeamEliminationLobby) {

    }

    private createBot() {
        const bot = new Bot(PlayerConnector.getNextId());
        this.bots.push(bot);
        EventHandler.callEvent(EventHandler.Event.PLAYER_JOIN, bot);
    }

    private removeBot(bot: Bot) {
        if (this.bots.includes(bot)) {
            this.bots.splice(this.bots.indexOf(bot), 1);
            EventHandler.callEvent(EventHandler.Event.PLAYER_LEAVE, bot);
        }
    }

    private updateBotQuantity() {
        this.botQuantity = this.getNextBotQuantity();
        setTimeout(() => {
            this.updateBotQuantity();
        }, this.getNextUpdateTime());
    }

    private getNextUpdateTime() {
        // Get time between 30 and 90 seconds.
        return Math.random() * 60 + 30 * 1000;
    }

    private getNextBotQuantity() {
        if (Math.random() < 0.66) {
            return BotHandler.LOW_BOT_QUANTITY;
        } else {
            return BotHandler.HIGH_BOT_QUANITY;
        }
    }
}
