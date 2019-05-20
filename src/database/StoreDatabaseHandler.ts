import * as mysql from "mysql";
import EventHandler from "../EventHandler";
import DatabaseHandler from "./DatabaseHandler";

export default class StoreDatabaseHandler {

    private pool: mysql.Pool | undefined;

    constructor() {
        EventHandler.addListener(this, EventHandler.Event.DB_POOL_UPDATE, this.onPoolUpdate);
    }

    public async getProducts() {
        const sql = "SELECT id, price, title, type, detail, parent_required, level_required, image_url FROM products";
        return await this.query(sql);
    }

    public async getPurchases(id: string) {
        const sql = "SELECT product FROM purchases WHERE player = ?";
        return await this.query(sql, [id]);
    }

    public async getSelections(id: string) {
        const sql = "SELECT product, position FROM selections WHERE player = ?";
        return await this.query(sql, [id]);
    }

    public async purchase(playerId: string, parentTitle: string, childTitles: string[], isFree: boolean, isSelect: boolean, type?: number) {

        const connection = await this.startTransaction();
        try {

            // Get products
            let productSql =  "SELECT id, price, title FROM products WHERE title IN (?";
            const productValues = [];
            productValues.push(parentTitle);

            for (const title of childTitles) {
                productSql += ", ?";
                productValues.push(title);
            }

            productSql += ")";
            const productResults = await this.queryFromConnection(connection, productSql, productValues);

            // Deduct currency
            if (!isFree) {
                const currencySql = "SELECT currency FROM players WHERE id = ?";
                const currencyResults = await this.queryFromConnection(connection, currencySql, [playerId]);
                const currency = currencyResults[0].currency;

                let price = 0;
                for (const priceResult of productResults) {
                    price += priceResult.price;
                }

                if (price > currency) {
                    await this.endTransaction(connection);
                    return false;
                } else {
                    const remainingCurrency = currency - price;
                    const deductionSql = "UPDATE players SET currency = ? WHERE id = ?";
                    await this.queryFromConnection(connection, deductionSql, [remainingCurrency, playerId]);
                }
            }

            // Create purchases
            const purchaseSql = "INSERT INTO purchases (player, product, type, parent, price), VALUES (?, ?, ?, ?, ?)";
            const purchaseValues = [];

        } catch (ex) {
            connection.rollback();
            return false;
        }
    }

    public async initPlayer(playerId: number) {

    }

    private onPoolUpdate(pool: mysql.Pool) {
        this.pool = pool;
    }

    private getPurchaseData(products: any[] ) {

    }

    private query(sql: string, values?: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            this.pool!.query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values,
            }, (err, results) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                resolve(results);
            });
        });
    }

    private queryFromConnection(connection: mysql.Connection, sql: string, values: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            connection.query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values,
            }, (err, results) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                resolve(results);
            });
        });
    }

    private startTransaction(): Promise<mysql.PoolConnection> {
        return new Promise((resolve, reject) => {
            this.pool!.getConnection((connectionErr: mysql.MysqlError, connection: mysql.PoolConnection) => {
                if (connectionErr) {
                    reject(connectionErr);
                }

                connection.beginTransaction((transactionErr: mysql.MysqlError) => {
                    if (transactionErr) {
                        reject(connectionErr);
                    }
                    resolve(connection);
                });
            });
        });
    }

    private endTransaction(connection: mysql.PoolConnection) {
        return new Promise((resolve, reject) => {
            connection.commit((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
