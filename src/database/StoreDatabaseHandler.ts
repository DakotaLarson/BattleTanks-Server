import * as mysql from "mysql";
import EventHandler from "../EventHandler";
import DatabaseHandler from "./DatabaseHandler";

export default class StoreDatabaseHandler {

    private pool: mysql.Pool | undefined;

    constructor() {
        EventHandler.addListener(this, EventHandler.Event.DB_POOL_UPDATE, this.onPoolUpdate);
    }

    public async purchase(playerId: string, productTitle: string, isFree: boolean, type: number) {

        const connection = await this.startTransaction();
        try {

            // Get products
            const productSql =  "SELECT id, price FROM products WHERE title = ?";
            const productResults = await this.queryFromConnection(connection, productSql, [productTitle]);

            if (productResults.length !== 1) {
                this.endTransaction(connection);
                return false;
            }

            // Deduct currency
            if (!isFree) {
                const isDeducted = await this.deductCurrency(connection, playerId, productResults[0].price);
                if (!isDeducted) {
                    await this.endTransaction(connection);
                    return false;
                }
            }

            // Create purchases
            const purchaseSql = "INSERT INTO purchases (player, product, type, price) VALUES (?, ?, ?, ?)";
            const purchaseValues = [playerId, productResults[0].id, type, productResults[0].price];
            await this.queryFromConnection(connection, purchaseSql, purchaseValues);

            return true;

        } catch (ex) {
            console.error(ex);
            connection.rollback();
            return false;
        }
    }

    public async select(playerId: string, productTitle: string, position?: number, parent?: number) {
        try {

            const productSql = "SELECT id FROM products WHERE title = ?";
            const products = await this.query(productSql, [productTitle]);
            let productId;
            if (products.length !== 1 || !products[0].id) {
                console.error("Unexpected product quantity: " + products.length + " title: " + productTitle);
                return false;
            } else {
                productId = products[0].id;
            }

            let sql;
            let values;

            if (position !== undefined && parent !== undefined) {

                sql = "INSERT INTO selections (player, product, position, parent) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE product = ?";
                values = [playerId, productTitle, position, parent, productId];

            } else {

                sql = "UPDATE selections SET product = ? WHERE player = ? AND position IS NULL AND parent IS NULL";
                values = [productId, playerId];

            }

            await this.query(sql, values);
            return true;
        } catch (ex) {
            console.error(ex);
            return false;
        }
    }

    public async initPlayer(playerId: string, productTitle: string, type: number) {
        const productSql = "SELECT id FROM products WHERE title = ?";
        const productResults = await this.query(productSql, [productTitle]);

        if (productResults.length === 1) {
            const purchaseSql = "INSERT INTO purchases (player, product, type, price) VALUES (?, ?, ?, ?)";
            const purchaseValues = [playerId, productResults[0].id, type, 0];

            const selectionSql = "INSERT INTO selections (player, product) VALUES (?, ?)";
            const selectionValues = [playerId, productResults[0].id];

            await Promise.all([
                this.query(purchaseSql, purchaseValues),
                this.query(selectionSql, selectionValues),
            ]);

        } else {
            console.error("Error during initialization purchase " + playerId + " results: " + productResults.length);
        }
    }

    public async getProducts() {
        const sql = "SELECT id, price, title, type, detail, parent_required, level_required, image_url FROM products";
        return await this.query(sql);
    }

    public async getPurchases(id: string) {
        const sql = "SELECT products.title, purchases.parent FROM purchases, products WHERE purchases.player = ? AND products.id = purchases.product";
        return await this.query(sql, [id]);
    }

    public async getSelections(id: string) {
        const sql = "SELECT products.title, selections.position FROM selections, products WHERE player = ? AND products.id = selections.product";
        return await this.query(sql, [id]);
    }

    private onPoolUpdate(pool: mysql.Pool) {
        this.pool = pool;
    }

    private async deductCurrency(connection: mysql.PoolConnection,  playerId: string, price: number) {
        const currencySql = "SELECT currency FROM players WHERE id = ?";
        const currencyResults = await this.queryFromConnection(connection, currencySql, [playerId]);
        const currency = currencyResults[0].currency;

        if (price > currency) {
            return false;
        } else {
            const remainingCurrency = currency - price;
            const deductionSql = "UPDATE players SET currency = ? WHERE id = ?";
            await this.queryFromConnection(connection, deductionSql, [remainingCurrency, playerId]);
            return true;
        }
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

    private queryFromConnection(connection: mysql.PoolConnection, sql: string, values: any[]): Promise<any> {
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
