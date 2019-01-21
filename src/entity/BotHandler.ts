import Lobby from "../core/Lobby";
import EventHandler from "../EventHandler";
import PlayerConnector from "../PlayerConnector";
import Bot from "./Bot";
import PlayerHandler from "./PlayerHandler";

export default class BotHandler {

    private static readonly LOW_PLAYER_QUANTITY = 4;
    private static readonly HIGH_PLAYER_QUANITY = 6;

    private playerQuantity: number;
    private bots: Map<Lobby, Bot[]>;

    constructor() {
        this.playerQuantity = 0;
        this.bots = new Map();
    }

    public start() {
        EventHandler.addListener(this, EventHandler.Event.BOTS_MATCH_START, this.onMatchStart);
        EventHandler.addListener(this, EventHandler.Event.BOTS_MATCH_END, this.onMatchEnd);
        EventHandler.addListener(this, EventHandler.Event.BOTS_LOBBY_ONLY_BOTS_REMAINING, this.onNoPlayersRemaining);
        this.updateBotQuantity();
    }

    private onMatchStart(lobby: Lobby) {
        const playerCount = PlayerHandler.getLobbyPlayerCount(lobby);
        if (playerCount < this.playerQuantity) {
            this.bots.set(lobby, []);
            for (let i = playerCount; i < this.playerQuantity; i ++) {
                this.createBot(lobby);
            }
        }
    }

    private onMatchEnd(lobby: Lobby) {
        this.removeBots(lobby);
        this.bots.delete(lobby);
    }

    private onNoPlayersRemaining(lobby: Lobby) {
        // const botArr = this.bots.get(lobby);
        // if (botArr) {
        //     this.removeBots(botArr);
        // }
    }

    private createBot(lobby: Lobby) {
        const bot = new Bot(PlayerConnector.getNextId());
        (this.bots.get(lobby) as Bot[]).push(bot);
        EventHandler.callEvent(EventHandler.Event.BOT_JOIN, {
            bot,
            lobby,
        });
    }

    private removeBots(lobby: Lobby) {
        const bots = this.bots.get(lobby);
        if (bots) {
            for (const bot of bots) {
                bots.splice(bots.indexOf(bot), 1);
                EventHandler.callEvent(EventHandler.Event.BOT_LEAVE, bot);
            }
        }
    }

    private updateBotQuantity() {
        this.playerQuantity = this.getNextBotQuantity();
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
            return BotHandler.LOW_PLAYER_QUANTITY;
        } else {
            return BotHandler.HIGH_PLAYER_QUANITY;
        }
    }
}
