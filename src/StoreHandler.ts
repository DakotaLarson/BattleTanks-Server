import StoreDatabaseHandler from "./database/StoreDatabaseHandler";

enum ProductType {
    TANK,
    COLOR,
}

enum PurchaseType {
    INITIALIZATION,
    STANDARD,
    BUNDLED,
}
export default class StoreHandler {

    private static readonly INITIALIZATION_PURCHASE_TITLE = "Little Timmy";

    private static readonly TANK_DEFAULT_COLORS = new Map([
        ["Little Timmy", [
            "Bisque",
            "Tan",
            "Green",
            "Dark Green",
        ]],
        ["The Big Mama", [
            "Silver",
            "Light Gray",
            "Charcoal",
            "Gold",
        ]],
    ]);

    private static readonly TANK_COLORS = [
        "Bisque",
        "Tan",
        "Green",
        "Dark Green",
        "Silver",
        "Light Gray",
        "Charcoal",
        "Gold",
    ];

    private databaseHandler: StoreDatabaseHandler;

    constructor(databaseHandler: StoreDatabaseHandler) {
        this.databaseHandler = databaseHandler;
    }

    public async handleRequest(id: any, body: any) {
        let responseData;
        if (body.purchase) {
            responseData = await this.handlePurchase(id, body);
        } else if (body.selection) {
            responseData = this.handleSelection(id, body);
        } else {
            const data = await this.getStore(id);
            responseData = {
                status: 200,
                data,
            };
        }

        return responseData;
    }

    public async getStore(id: string) {
        const products = await this.databaseHandler.getPlayerProducts();
        const purchases = await this.databaseHandler.getPlayerPurchases(id);
        const selections = await this.databaseHandler.getPlayerSelections(id);

        const tanks: any = {};
        const colors: any = {};
        // all: title, price, level
        // tank: imageurl, purchased, selected
        // color

        for (const product of products) {

            let productData: any = {
                price: product.price,
                level_required: product.level_required,
            };

            if (product.type === ProductType.TANK) {

                productData.image_url = product.image_url;

                productData.purchased = this.isPurchased(product.title, purchases);
                productData.selected = this.isSelected(product.title, selections);

                productData = Object.assign(productData, this.getTankColorData(product, purchases, selections));

                tanks[product.title] = productData;
            } else if (product.type === ProductType.COLOR) {

                productData.detail = product.detail;
                colors[product.title] = productData;
            }

        }

        return {
            tanks,
            colors,
        };
    }

    public async initPlayer(playerId: string) {
        this.databaseHandler.initPlayer(playerId, StoreHandler.INITIALIZATION_PURCHASE_TITLE, StoreHandler.TANK_DEFAULT_COLORS.get(StoreHandler.INITIALIZATION_PURCHASE_TITLE)!, PurchaseType.INITIALIZATION);
    }

    private async handlePurchase(id: string, body: any) {
        let status = 400;
        const defaultColors = StoreHandler.TANK_DEFAULT_COLORS.get(body.parent);

        if ((body.parent && defaultColors && !defaultColors.includes(body.purchase)) || (!body.parent && StoreHandler.TANK_DEFAULT_COLORS.has(body.purchase))) {

            const isValidTransaction = await this.databaseHandler.purchase(id, body.purchase, false, PurchaseType.STANDARD, body.parent, StoreHandler.TANK_DEFAULT_COLORS.get(body.purchase), PurchaseType.BUNDLED);

            if (isValidTransaction) {
               status = 200;
            } else {
                status = 500;
            }
        }

        return {
            status,
        };
    }

    private async handleSelection(playerId: string, body: any) {
        let status = 400;
        if (body.parent && "position" in body) {
            // Selection is for color
            if (this.validateColorSelectionRequest(body)) {

                const isValidTransaction = this.databaseHandler.select(playerId, body.selection, body.position, body.parent);

                if (isValidTransaction) {
                    status = 200;
                } else {
                    status = 500;
                }
            }
        } else if (StoreHandler.TANK_DEFAULT_COLORS.has(body.selection)) {
            // selection is for tank
            const isValidTransaction = await this.databaseHandler.select(playerId, body.selection);
            if (isValidTransaction) {
                status = 200;
            } else {
                status = 500;
            }
        }

        return {
            status,
        };
    }

    private isPurchased(title: string, purchases: any[]) {
        for (const purchase of purchases) {
            if (purchase.title === title) {
                return true;
            }
        }
        return false;
    }

    private isSelected(title: string, selections: any[]) {
        for (const selection of selections) {
            if (selection.title === title) {
                return true;
            }
        }
        return false;
    }

    private getTankColorData(product: any, purchases: any[], selections: any[]) {
        const purchasedColors = [];
        const selectedColors = [];

        for (const purchase of purchases) {
            if (purchase.parent === product.id) {
                purchasedColors.push(purchase.title);
            }
        }

        for (const selection of selections) {
            if (selection.parent === product.id) {
                selectedColors[selection.position] = selection.title;
            }
        }

        return {
            purchasedColors,
            selectedColors,
        };
    }

    private validateColorSelectionRequest(body: any) {
        if (StoreHandler.TANK_COLORS.includes(body.selection)) {

            const defaultColors = StoreHandler.TANK_DEFAULT_COLORS.get(body.parent);
            if (defaultColors) {

                if (!isNaN(body.position) && body.position >= 0 && body.position < defaultColors.length) {
                    return true;
                }
            }
        }
        return false;
    }
}
