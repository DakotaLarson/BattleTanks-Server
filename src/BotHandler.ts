import Bot from "./Bot";
import EventHandler from "./EventHandler";
import Lobby from "./lobby/Lobby";
import TeamEliminationLobby from "./lobby/TeamEliminationLobby";
import PlayerConnector from "./PlayerConnector";

export default class BotHandler {

    private static readonly LOW_BOT_QUANTITY = 3;
    private static readonly HIGH_BOT_QUANITY = 5;

    private botQuantity: number;

    private bots: Map<Lobby, Bot[]>;

    constructor() {
        this.botQuantity = 0;
        this.bots = new Map();
    }

    public start() {
        EventHandler.addListener(this, EventHandler.Event.LOBBY_CREATION, this.onLobbyCreation);
        EventHandler.addListener(this, EventHandler.Event.LOBBY_REMOVAL, this.onLobbyRemoval);
        EventHandler.addListener(this, EventHandler.Event.LOBBY_ONLY_BOTS_REMAINING, this.onNoPlayersRemaining);
        this.updateBotQuantity();
    }

    private onLobbyCreation(lobby: Lobby) {
        this.bots.set(lobby, []);
        for (let i = 0; i < this.botQuantity; i ++) {
            this.createBot(lobby);
        }
    }

    private onLobbyRemoval(lobby: Lobby) {
        this.bots.delete(lobby);
    }

    private onNoPlayersRemaining(lobby: TeamEliminationLobby) {
        const botArr = this.bots.get(lobby);
        if (botArr) {
            this.removeBots(botArr);
        }
    }

    private createBot(lobby: Lobby) {
        const bot = new Bot(PlayerConnector.getNextId());
        (this.bots.get(lobby) as Bot[]).push(bot);
        EventHandler.callEvent(EventHandler.Event.PLAYER_JOIN, bot);
    }

    private removeBots(bots: Bot[]) {
        for (const bot of bots) {
            bots.splice(bots.indexOf(bot), 1);
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
