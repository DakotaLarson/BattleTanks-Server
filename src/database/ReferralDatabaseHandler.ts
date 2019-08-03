import * as mysql from "mysql";
import EventHandler from "../main/EventHandler";
import Utils from "../main/Utils";
import DatabaseUtils from "./DatabaseUtils";

export default class ReferralDatabaseHandler {

    private static readonly REFERRED_PERCENTAGE = 5;
    private static readonly REFERRED_TIME_REWARD = 1000;

    private static readonly REFERRED_REWARD_TIME = 60 * 60; // 1 hour in seconds.

    private utils: DatabaseUtils;

    constructor() {

        EventHandler.addListener(this, EventHandler.Event.DB_POOL_UPDATE, this.onPoolUpdate);

        this.utils = new DatabaseUtils();
    }

    public async addReferrer(playerId: string) {
        const referralCode = Utils.generateCode(6);

        const sql = "INSERT INTO referrals (referrer, referral_code) VALUES (?, ?)";
        const values = [playerId, referralCode];

        try {
            await this.utils.query(sql, values);
        } catch (err) {
            if (err.code === "ER_DUP_ENTRY" && err.sqlMessage.includes("referral_code")) {
                console.log("Duplicate referral code generated.");
                await this.addReferrer(playerId);
            }
        }
    }

    public async setReferredFrom(playerId: string, referrer: string) {
        const sql = "UPDATE referrals SET referred_from = ? WHERE referrer = ?";
        const values = [referrer, playerId];
        await this.utils.query(sql, values);
    }

    public async getReferrer(playerId: string, referralCode: string) {
        const sql = "SELECT referrer FROM referrals WHERE referral_code = ? AND referrer != ?";
        const values = [referralCode, playerId];
        const results = await this.utils.query(sql, values);
        if (results.length === 0) {
            return undefined;
        } else if (results.length === 1) {
            return results[0].referrer;
        } else {
            console.error("Multiple referrers found for referral code: " + referralCode);
            return undefined;
        }
    }

    public async getData(playerId: string) {
        const sql = "SELECT players.username, referred_currency, referred_time, referral_code, (SELECT COUNT(*) FROM referrals WHERE referred_from = ?) AS 'referral_count' FROM referrals LEFT JOIN players ON referred_from = players.id WHERE referrer = ?";
        const values = [playerId, playerId];

        const results = await this.utils.query(sql, values);
        if (results.length === 1) {
            return results[0];
        } else if (results.length === 0) {
            return undefined;
        } else {
            throw new Error("Multiple referrers found with id: " + playerId);
        }
    }

    public async getReferralData(ids: string[]) {

        let sql = "SELECT referrer, referral_currency, referral_time FROM referrals WHERE referred_from IS NOT NULL AND referrer IN (?";
        for (let i = 1; i < ids.length; i ++) {
            sql += ", ?";
        }
        sql += ")";

        const results = await this.utils.query(sql, ids);
        const referralData = new Map();

        for (const result of results) {
            referralData.set(result.referrer, {
                currency: result.referral_currency,
                time: result.referral_time,
            });
        }

        return referralData;
    }

    public async updateReferralCurrencyData(data: Map<string, number>) {
        await this.updateData(data, "referral_currency");
    }

    public async updateReferralTimeData(data: Map<string, number>) {
        await this.updateData(data, "referral_time");
    }

    public async updateReferredData() {
        const connection = await this.utils.startTransaction();

        try {
            const referralSql = "SELECT referred_from, referral_currency, referral_time FROM referrals WHERE referred_from IS NOT NULL AND (referral_currency != 0 OR referral_time != 0)";

            const referralResults = await this.utils.queryFromConnection(connection, referralSql);
            if (referralResults.length) {

                const referredIds = [];
                for (const result of referralResults) {
                    referredIds.push(result.referred_from);
                }

                let referrerSql = "SELECT referrer, referred_currency, referred_time FROM referrals WHERE referrer IN (?";
                for (let i = 1; i < referredIds.length; i ++) {
                    referrerSql += ", ?";
                }
                referrerSql += ")";

                const referrerResults = await this.utils.queryFromConnection(connection, referrerSql, referredIds);

                const updatedReferrerTimes: Map<string, number> = new Map();
                const updatedReferrerCurrencies: Map<string, number> = new Map();

                const referrerCurrencyDeltas: Map<string, number> = new Map();

                const eligibleReferrers = [];

                // Populate initial referrer data, elegibility
                for (const referrerResult of referrerResults) {

                    const referrer = referrerResult.referrer;
                    const time = referrerResult.referred_time;
                    const currency = referrerResult.referred_currency;

                    updatedReferrerTimes.set(referrer, time);
                    if (time < ReferralDatabaseHandler.REFERRED_REWARD_TIME) {
                        eligibleReferrers.push(referrer);
                    }

                    updatedReferrerCurrencies.set(referrer, currency);

                }

                // Add referral time, currency
                for (const referral of referralResults) {

                    const referrerTime = updatedReferrerTimes.get(referral.referred_from)!;
                    const referrerCurrency = updatedReferrerCurrencies.get(referral.referred_from)!;

                    const updatedTime = referrerTime + referral.referral_time;
                    const updatedCurrency = referrerCurrency + referral.referral_currency;

                    updatedReferrerTimes.set(referral.referred_from, updatedTime);
                    updatedReferrerCurrencies.set(referral.referred_from, updatedCurrency);

                    referrerCurrencyDeltas.set(referral.referred_from, updatedCurrency);
                }

                // Add reward to elible referrers who cross threshold.
                for (const referrer of eligibleReferrers) {
                    const time = updatedReferrerTimes.get(referrer)!;

                    if (time >= ReferralDatabaseHandler.REFERRED_REWARD_TIME) {

                        const currency = updatedReferrerCurrencies.get(referrer)!;
                        const currencyDelta = referrerCurrencyDeltas.get(referrer)!;

                        updatedReferrerCurrencies.set(referrer, currency + ReferralDatabaseHandler.REFERRED_TIME_REWARD);

                        referrerCurrencyDeltas.set(referrer, currencyDelta + ReferralDatabaseHandler.REFERRED_TIME_REWARD);

                    }
                }

                // Update referral table
                await this.updateData(updatedReferrerCurrencies, "referred_currency", connection);
                await this.updateData(updatedReferrerTimes, "referred_time", connection);

                await this.updatePlayerCurrencies(connection, referrerCurrencyDeltas);

                await this.resetReferralData(connection);

            }
            await this.utils.commit(connection);
        } catch (err) {
            console.error(err);
            await this.utils.rollback(connection);
        }

    }

    private onPoolUpdate(pool: mysql.Pool) {
        this.utils.setPool(pool);
    }

    private async updateData(data: Map<string, number>, columnName: string, connection?: mysql.PoolConnection) {
        const values = [];

        let sql = "UPDATE referrals SET " + columnName + " = CASE";
        for (const [id, value] of data) {
            sql += " WHEN referrer = ? THEN ? ";
            values.push(id, value);
        }
        sql += " END WHERE referrer IN (";
        for (const [id] of data) {
            sql += "?, ";
            values.push(id);
        }
        if (data.size) {
            sql = sql.substr(0, sql.length - 2);
        }
        sql += ")";

        if (connection) {
            await this.utils.queryFromConnection(connection, sql, values);
        } else {
            await this.utils.query(sql, values);
        }
    }

    private async updatePlayerCurrencies(connection: mysql.PoolConnection, currencyDeltas: Map<string, number>) {

        const playerIds = [];

        let currencySql = "SELECT id, currency FROM players WHERE id IN (";
        for (const [playerId] of currencyDeltas) {
            playerIds.push(playerId);
            currencySql += "?, ";
        }
        currencySql = currencySql.substr(0, currencySql.length - 2) + ")";
        const currencyResults = await this.utils.queryFromConnection(connection, currencySql, playerIds);

        const updatedCurrencies: Map<string, number> = new Map();

        for (const result of currencyResults) {
            updatedCurrencies.set(result.id, Math.round(currencyDeltas.get(result.id)! * ReferralDatabaseHandler.REFERRED_PERCENTAGE / 100) + result.currency);
        }

        let updateSql = "UPDATE players SET currency = CASE";
        const updateValues = [];

        for (const [playerId, currency] of updatedCurrencies) {
            updateSql += " WHEN id = ? THEN ?";
            updateValues.push(playerId, currency);
        }

        updateSql += " END WHERE id IN (";

        for (const [playerId] of updatedCurrencies) {
            updateSql += "?, ";
            updateValues.push(playerId);
        }

        if (updatedCurrencies.size) {
            updateSql = updateSql.substr(0, updateSql.length - 2);
        }
        updateSql += ")";

        await this.utils.queryFromConnection(connection, updateSql, updateValues);

    }

    private async resetReferralData(connection: mysql.PoolConnection) {
        const sql = "UPDATE referrals SET referral_currency = 0, referral_time = 0";
        await this.utils.queryFromConnection(connection, sql);
    }

}
