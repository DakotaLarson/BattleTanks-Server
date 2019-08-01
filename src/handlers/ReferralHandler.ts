import ReferralDatabaseHandler from "../database/ReferralDatabaseHandler";
import EventHandler from "../main/EventHandler";

export default class ReferralHandler {

    private databaseHandler: ReferralDatabaseHandler;

    constructor() {
        this.databaseHandler = new ReferralDatabaseHandler();

        EventHandler.addListener(this, EventHandler.Event.DB_PLAYER_UPDATE, this.onPlayerUpdate);
        EventHandler.addListener(this, EventHandler.Event.DB_PLAYERS_UPDATE, this.onPlayersUpdate);

        this.scheduleReferredUpdate();
    }

    public async addPlayTime(playerId: string, time: number) {
        const referralDataById = await this.databaseHandler.getReferralData([playerId]);
        const referralData = referralDataById.get(playerId);

        if (referralData) {
            const updatedTime: Map<string, number> = new Map();

            const totalTime = referralData.time + time;
            updatedTime.set(playerId, totalTime);

            this.databaseHandler.updateReferralTimeData(updatedTime);
        }
    }

    public async initPlayer(id: string) {
        await this.databaseHandler.addReferrer(id);
    }

    public async setReferredFrom(id: string, code: string) {
        const referrer = await this.databaseHandler.getReferrer(id, code);
        if (referrer) {
            await this.databaseHandler.setReferredFrom(id, referrer);
            return true;
        } else {
           return false;
        }
    }

    public async getReferralData(id: string) {
        const rawData = await this.databaseHandler.getData(id);

        let data: any;
        if (rawData) {
            data = {
                referrer : rawData.username,
                code : rawData.referral_code,
                currency : rawData.referred_currency,
                time : rawData.referred_time,
                referrals : rawData.referral_count,
            };
        }
        return data;
    }

    private async onPlayerUpdate(event: any) {
        const currency = event.data.currency;

        const referralDataById = await this.databaseHandler.getReferralData([event.id]);
        const referralData = referralDataById.get(event.id);

        if (referralData) {
            const updatedCurrency: Map<string, number> = new Map();
            const totalCurrency = referralData.currency + currency;

            updatedCurrency.set(event.id, totalCurrency);

            await this.databaseHandler.updateReferralCurrencyData(updatedCurrency);
        }
    }

    private async onPlayersUpdate(matchData: Map<string, any>) {
        const ids = [];
        for (const [id] of matchData) {
            ids.push(id);
        }
        if (ids.length) {
            const referralDataById = await this.databaseHandler.getReferralData(ids);

            const updatedCurrency: Map<string, number> = new Map();

            for (const id of ids) {
                const referralData = referralDataById.get(id);

                if (referralData) {
                    const totalCurrency = matchData.get(id)!.currency + referralData.currency;
                    updatedCurrency.set(id, totalCurrency);
                }
            }

            if (updatedCurrency.size) {
                await this.databaseHandler.updateReferralCurrencyData(updatedCurrency);
            }
        }
    }

    private scheduleReferredUpdate() {
        const now = new Date();
        const resetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const resetTime = resetDate.getTime() - now.getTime();
        setTimeout(() => {
            this.databaseHandler.updateReferredData();
            this.scheduleReferredUpdate();
        }, resetTime);
    }
}
