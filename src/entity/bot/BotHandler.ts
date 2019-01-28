import Lobby from "../../core/Lobby";
import EventHandler from "../../EventHandler";
import PlayerConnector from "../../PlayerConnector";
import Vector3 from "../../vector/Vector3";
import PlayerHandler from "../PlayerHandler";
import Bot from "./Bot";
import BotPathHandler from "./BotPathHandler";
import BotQuantityHandler from "./BotQuantityHandler";

export default class BotHandler {

    private static readonly LOGIC_TICK_INTERVAL = 250;

    private botQuantityHandler: BotQuantityHandler;

    private botQuantity: number;
    private bots: Map<Lobby, Bot[]>;
    private pathHandlers: Map<Lobby, BotPathHandler>;

    constructor() {
        this.botQuantityHandler = new BotQuantityHandler();
        this.botQuantity = 0;

        this.bots = new Map();
        this.pathHandlers = new Map();
    }

    public enable() {
        EventHandler.addListener(this, EventHandler.Event.BOTS_QUANTITY_UPDATE, this.onQuantityUpdate);
        EventHandler.addListener(this, EventHandler.Event.BOTS_MATCH_START, this.onMatchStart);
        EventHandler.addListener(this, EventHandler.Event.BOTS_AFTER_MATCH_START, this.onAfterMatchStart);
        EventHandler.addListener(this, EventHandler.Event.BOTS_MATCH_END, this.onMatchEnd);

        this.botQuantityHandler.enable();
        this.runLogicTick();
    }

    public getPath(lobby: Lobby, from: Vector3, to: Vector3) {
        const pathHandler = this.pathHandlers.get(lobby);
        if (pathHandler) {
            return pathHandler.getPath(from, to);
        } else {
            throw new Error("No pathhandler for lobby");
        }
    }

    public hasLineOfSight(lobby: Lobby, from: Vector3, to: Vector3, targetRot: number) {
        const pathHandler = this.pathHandlers.get(lobby);
        if (pathHandler) {
            return pathHandler.hasLineOfSight(from, to, targetRot);
        } else {
            throw new Error("No pathhandler for lobby");
        }
    }

    public canMove(lobby: Lobby, bot: Bot, to: Vector3) {
        const pathHandler = this.pathHandlers.get(lobby);
        if (pathHandler) {
            return pathHandler.canMove(bot, to);
        } else {
            throw new Error("No pathhandler for lobby");
        }
    }

    public getBots(lobby: Lobby) {
        const bots = this.bots.get(lobby);
        if (!bots) {
            throw new Error("No bots for lobby");
        }
        return bots;
    }

    private onMatchStart(lobby: Lobby) {
        const playerCount = PlayerHandler.getLobbyPlayerCount(lobby);
        if (playerCount) {
           if (playerCount < this.botQuantity) {
                this.bots.set(lobby, []);
                for (let i = playerCount; i <= this.botQuantity; i ++) {
                    this.createBot(lobby);
                }
            }
        }
    }

    private onAfterMatchStart(data: any) {
        const bots = this.bots.get(data.lobby);
        if (bots) {
            const players = [];

            for (const player of PlayerHandler.getLobbyPlayers(data.lobby)) {
                players.push(player);
            }
            for (const bot of bots) {
                players.push(bot);
            }

            const pathHandler = new BotPathHandler(data.arena, this, data.lobby);
            this.pathHandlers.set(data.lobby, pathHandler);

            for (const bot of bots) {
                bot.think();
            }
        }
    }

    private onMatchEnd(lobby: Lobby) {
        this.removeBots(lobby);
        this.bots.delete(lobby);
        const pathHandler = this.pathHandlers.get(lobby);
        if (pathHandler) {
            pathHandler.disable();
            this.pathHandlers.delete(lobby);
        }
    }

    private onQuantityUpdate(quantity: number) {
        this.botQuantity = quantity;
    }

    private createBot(lobby: Lobby) {
        const bot = new Bot(PlayerConnector.getNextId(), lobby, this);
        bot.enable();
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
                bot.disable();
                EventHandler.callEvent(EventHandler.Event.BOT_LEAVE, {
                    bot,
                    lobby,
                });
            }
            bots.splice(0, bots.length);
        }
    }

    private runLogicTick() {
        setInterval(() => {
            EventHandler.callEvent(EventHandler.Event.BOTS_LOGIC_TICK);
        }, BotHandler.LOGIC_TICK_INTERVAL);
    }

}
