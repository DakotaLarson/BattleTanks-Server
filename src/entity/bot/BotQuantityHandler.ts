import EventHandler from "../../EventHandler";

export default class BotQuantityHandler {

    private static readonly LOW_PLAYER_QUANTITY = 4;
    private static readonly HIGH_PLAYER_QUANITY = 6;

    public enable() {
        this.updateBotQuantity();
    }

    private updateBotQuantity() {
        const botQuantity = this.getNextBotQuantity();
        EventHandler.callEvent(EventHandler.Event.BOTS_QUANTITY_UPDATE, botQuantity);
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
            return BotQuantityHandler.LOW_PLAYER_QUANTITY;
        } else {
            return BotQuantityHandler.HIGH_PLAYER_QUANITY;
        }
    }
}
