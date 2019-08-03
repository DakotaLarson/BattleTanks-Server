import * as mysql from "mysql";
import EventHandler from "../main/EventHandler";
import DatabaseUtils from "./DatabaseUtils";

export default class StoreDatabaseHandler {

    private utils: DatabaseUtils;

    constructor() {
        EventHandler.addListener(this, EventHandler.Event.DB_POOL_UPDATE, this.onPoolUpdate);

        this.utils = new DatabaseUtils();
    }

    public async purchase(playerId: string, productTitle: string, isFree: boolean, type: number, parentTitle?: string, childTitles?: string[], childType?: number) {

        const connection = await this.utils.startTransaction();
        try {

            // Get products
            const productResults = await this.getProducts(connection, productTitle, parentTitle, childTitles);

            const productResult = productResults.get(productTitle)!;

            // Deduct currency
            if (!isFree) {
                const isDeducted = await this.deductCurrency(connection, playerId, productResult.price);
                if (!isDeducted) {
                    throw new Error("Currency not deducted");
                }
            }

            // Create purchases
            let purchaseSql = "INSERT INTO purchases (player, product, type, price, parent) VALUES (?, ?, ?, ?, ?)";
            const purchaseValues = [playerId, productResult.id, type, productResult.price];
            if (parentTitle) {
                purchaseValues.push(productResults.get(parentTitle)!.id);
            } else {
                purchaseValues.push(-1);
            }

            if (childTitles) {

                for (const childTitle of childTitles) {
                    const childResult = productResults.get(childTitle)!;
                    purchaseSql += ", (?, ?, ?, ?, ?)";
                    purchaseValues.push(playerId, childResult.id, childType, 0, productResult.id);
                }

                let selectionSql = "INSERT INTO selections (player, product, position, parent) VALUES (?, ?, ?, ?)";
                const selectionValues = [playerId, productResults.get(childTitles[0])!.id, 0, productResult.id];

                for (let i = 1; i < childTitles.length; i ++) {
                    selectionSql += ", (?, ?, ?, ?)";
                    selectionValues.push(playerId, productResults.get(childTitles[i])!.id, i, productResult.id);
                }

                await this.utils.queryFromConnection(connection, selectionSql, selectionValues);
            }
            await this.utils.queryFromConnection(connection, purchaseSql, purchaseValues);

            this.utils.commit(connection);

            return true;

        } catch (ex) {
            console.error(ex);
            connection.rollback();
            return false;
        }
    }

    public async select(playerId: string, productTitle: string, position?: number, parentTitle?: string) {

        try {
            const product = await this.getPurchasedProduct(playerId, productTitle, parentTitle);

            const updateSql = "UPDATE selections SET product = ? WHERE player = ? AND position = ? AND parent = ?";
            const updateValues = [product.product, playerId];
            if (parentTitle) {
                updateValues.push(position, product.parent);
            } else {
                updateValues.push(-1, -1);
            }

            await this.utils.query(updateSql, updateValues);
        } catch (ex) {
            console.error(ex);
            return false;
        }

        return true;
    }

    // public async selectDefault(playerId: string, position: number, parentTitle: string) {
    //     try {
    //         const sql = "DELETE FROM selections WHERE player = ? AND position = ? AND parent = (SELECT purchases.product from purchases, products WHERE purchases.player = ? AND products.title = ? AND products.id = purchases.product)";
    //         const values = [playerId, position, playerId, parentTitle];

    //         await this.databaseUtils.query(sql, values);
    //     } catch (ex) {
    //         console.error(ex);
    //         return false;
    //     }
    //     return true;
    // }

    public async initPlayer(playerId: string, productTitle: string, colorTitles: string[], type: number) {
        const productTitles = colorTitles.slice();
        productTitles.push(productTitle);

        const productIdsByTitles: Map<string, number> = new Map();

        let productSql = "SELECT id, title FROM products WHERE title IN (?";
        for (let i = 1; i < productTitles.length; i ++) {
            productSql += ", ?";
        }
        productSql += ")";
        const productResults = await this.utils.query(productSql, productTitles);

        for (const product of productResults) {
            productIdsByTitles.set(product.title, product.id);
        }

        const parentId = productIdsByTitles.get(productTitle);

        if (parentId) {
            let purchaseSql = "INSERT INTO purchases (player, product, type, parent, price) VALUES (?, ?, ?, ?, ?)";
            const purchaseValues = [playerId, parentId, type, -1, 0];

            for (const [, id] of productIdsByTitles) {
                if (id !== parentId) {
                    purchaseSql += ", (?, ?, ?, ?, ?)";
                    purchaseValues.push(playerId, id, type, parentId, 0);
                }
            }

            let selectionSql = "INSERT INTO selections (player, product, position, parent) VALUES (?, ?, ?, ?)";
            const selectionValues = [playerId, parentId, -1, -1];

            for (const [title, id] of productIdsByTitles) {
                if (id !== parentId) {
                    selectionSql += ", (?, ?, ?, ?)";
                    selectionValues.push(playerId, id, colorTitles.indexOf(title), parentId);
                }
            }

            await Promise.all([
                this.utils.query(purchaseSql, purchaseValues),
                this.utils.query(selectionSql, selectionValues),
            ]);

        } else {
            console.error("Error during initialization purchase " + playerId + " results: " + productResults.length);
        }
    }

    public async getPlayerProducts() {
        const sql = "SELECT id, price, title, type, detail, parent_required, level_required, image_url FROM products";
        return await this.utils.query(sql);
    }

    public async getPlayerPurchases(playerID: string) {
        const sql = "SELECT products.title, purchases.parent FROM purchases, products WHERE purchases.player = ? AND products.id = purchases.product";
        return await this.utils.query(sql, [playerID]);
    }

    public async getPlayerSelections(playerId: string) {
        const sql = "SELECT products.title, selections.position, selections.parent FROM selections, products WHERE selections.player = ? AND products.id = selections.product";
        return await this.utils.query(sql, [playerId]);
    }

    public async getPlayerCurrentSelection(playerId: string): Promise<any[]> {
        const sql = "SELECT products.detail, products.type, selections.position FROM products, selections WHERE selections.player = ? AND products.id = selections.product AND (selections.parent = -1 OR selections.parent = (SELECT product FROM selections WHERE player = ? AND parent = -1))";
        return await this.utils.query(sql, [playerId, playerId]);
    }

    private onPoolUpdate(pool: mysql.Pool) {
        this.utils.setPool(pool);
    }

    private async deductCurrency(connection: mysql.PoolConnection,  playerId: string, price: number) {
        const currencySql = "SELECT currency FROM players WHERE id = ?";
        const currencyResults = await this.utils.queryFromConnection(connection, currencySql, [playerId]);
        const currency = currencyResults[0].currency;

        if (price > currency) {
            return false;
        } else {
            const remainingCurrency = currency - price;
            const deductionSql = "UPDATE players SET currency = ? WHERE id = ?";
            await this.utils.queryFromConnection(connection, deductionSql, [remainingCurrency, playerId]);
            return true;
        }
    }

    private async getProducts(connection: mysql.PoolConnection, productTitle: string, parentTitle?: string, childTitles?: string[]) {
        let productSql =  "SELECT id, price, title FROM products WHERE title IN (?";
        const productValues = [productTitle];
        if (parentTitle) {
            productSql += ", ?";
            productValues.push(parentTitle);
        }

        if (childTitles) {
            for (const childTitle of childTitles) {
                productSql += ", ?";
                productValues.push(childTitle);
            }
        }

        productSql += ")";

        const productResults = await this.utils.queryFromConnection(connection, productSql, productValues);

        const results: Map<string, any> = new Map();
        for (const result of productResults) {
            results.set(result.title, {
                id: result.id,
                price: result.price,
            });
        }

        return results;
    }

    private async getPurchasedProduct(playerId: string, productTitle: string, parentTitle?: string) {
        let productSql;
        const productValues = [playerId, productTitle];

        if (parentTitle) {
            productSql = "SELECT purchases.product, purchases.parent FROM purchases, products WHERE purchases.player = ? AND products.title = ? AND products.id = purchases.product AND purchases.parent = (SELECT id FROM products WHERE title = ?)";
            productValues.push(parentTitle);

        } else {
            productSql = "SELECT purchases.product FROM purchases, products WHERE purchases.player = ? AND products.title = ? AND products.id = purchases.product";
        }

        const products = await this.utils.query(productSql, productValues);

        if (products.length !== 1) {
            throw new Error("Unexpected product quantity: " + products.length);
        } else {
            return products[0];
        }
    }
}
