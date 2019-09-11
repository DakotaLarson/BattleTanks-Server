import StoreDatabaseHandler from "../database/StoreDatabaseHandler";

enum ProductType {
    TANK,
    COLOR,
}

enum PurchaseType {
    INITIALIZATION,
    STANDARD,
    BUNDLED,
}

enum SelectionType {
    TANK,
    COLOR,
}
export default class StoreHandler {

    private static readonly INITIALIZATION_PURCHASE_TITLE = "BeefChief";

    private static readonly TANK_DEFAULT_COLORS = new Map([
        ["BeefChief", [
            "Khaki",
            "Coffee",
            "Mantis",
            "Forest Green",
        ]],
        ["Snowplow", [
            "Silver",
            "Ash Gray",
            "Jet",
            "Citrine",
        ]],
        ["Dunebug", [
            "Ecru",
            "Chocolate",
            "Jet",
        ]],
        ["Lightning", [
            "Bice Blue",
            "Black Olive",
        ]],
        ["Jarhead", [
            "Davy's Gray",
            "Feldgrau",
            "Battleship Gray",
            "Champagne",
            "Cool Gray",
            "Fern Green",
            "Burgundy",
        ]],
        ["Tankette", [
            "Cream",
            "Gunmetal",
            "Slate Gray",
            "Marengo",
        ]],
        ["Bullseye", [
            "Carmine",
            "Cadet Gray",
            "Jasmine",
            "Gray",
            "Almond",
            "Payne's Gray",
        ]],
        ["Challenger", [
            "Charcoal",
            "Burnt Orange",
        ]],
        ["Schnoz", [
            "Mint",
            "Aureolin",
            "Fluorescent Blue",
            "Dim Gray",
            "Fern Green",
        ]],
        ["Hornet", [
            "Gunmetal",
            "Mikado Yellow",
            "Cool Gray",
            "Alabaster",
            "Platinum",
        ]],
        ["Bunker", [
            "Jungle Green",
            "Ebony",
        ]],
        ["Centurion", [
            "Ice Blue",
            "Beaver",
            "Caribbean Current",
            "Brown Sugar",
            "Davy's Gray",
            "Jasmine",
            "Light Sea Green",
            "Baby Blue",
            "Mango",
            "Garnet",
        ]],
        ["Ogimatok", [
            "Blue-Gray",
            "Cornflower Blue",
            "Dim Gray",
            "Glaucous",
            "Bone",
            "Feldgrau",
            "Dark Red",
            "Linen",
            "Mindaro",
            "Aqua-Cyan",
        ]],
    ]);

    private databaseHandler: StoreDatabaseHandler;

    constructor() {
        this.databaseHandler = new StoreDatabaseHandler();
    }

    public async handleRequest(body: any, id?: string) {
        let responseData;
        if (id) {
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
        } else {
            const data = await this.getStore();
            responseData = {
                status: 200,
                data,
            };
        }

        return responseData;
    }

    public async getStore(id?: string) {
        const products = await this.databaseHandler.getPlayerProducts();
        let purchases = [];
        let selections = [];
        if (id) {
            purchases = await this.databaseHandler.getPlayerPurchases(id);
            selections = await this.databaseHandler.getPlayerSelections(id);
        }

        const tanks: any = {};
        const colors: any = {};
        // all: title, price, level
        // tank: imageurl, purchased, selected
        // color

        for (const product of products) {

            let productData: any = {
                price: product.price,
                level_required: product.level_required,
                detail: product.detail,
            };

            if (product.type === ProductType.TANK) {

                productData.image_url = product.image_url;

                productData.purchased = this.isPurchased(product.title, purchases);
                productData.selected = this.isSelected(product.title, selections);

                productData = Object.assign(productData, this.getTankColorData(product, purchases, selections));

                tanks[product.title] = productData;
            } else if (product.type === ProductType.COLOR) {

                colors[product.title] = productData;
            }

        }

        return {
            tanks,
            colors,
        };
    }

    public async getPaymentDetails(playerId: string, paymentId: string) {
        const results = await this.databaseHandler.getCompletedPaymentCurrency(playerId, paymentId);
        return {
            complete: results.length > 0,
            currency: results.length > 0 ? results[0].currency as number : 0,
        };
    }

    public async initPlayer(playerId: string) {
        this.databaseHandler.initPlayer(playerId, StoreHandler.INITIALIZATION_PURCHASE_TITLE, StoreHandler.TANK_DEFAULT_COLORS.get(StoreHandler.INITIALIZATION_PURCHASE_TITLE)!, PurchaseType.INITIALIZATION);
    }

    public async getPlayerCurrentSelection(playerId: string) {
        const selections = await this.databaseHandler.getPlayerCurrentSelection(playerId);
        const colors = [];
        let tank;
        for (const selection of selections) {
            if (selection.type === SelectionType.TANK) {
                tank = selection.detail;
            } else if (selection.type === SelectionType.COLOR) {
                colors[selection.position] = selection.detail;
            }
        }

        return {
            tank,
            colors,
        };
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
        let purchasedColors = [];
        let selectedColors = [];

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

        if (!purchasedColors.length) {
            purchasedColors = StoreHandler.TANK_DEFAULT_COLORS.get(product.title)!;
        }
        if (!selectedColors.length) {
            selectedColors = StoreHandler.TANK_DEFAULT_COLORS.get(product.title)!;
        }

        return {
            purchasedColors,
            selectedColors,
        };
    }

    private async validateColorSelectionRequest(body: any) {
        const colors = await this.databaseHandler.getColorNames(ProductType.COLOR);
        if (colors.includes(body.selection)) {

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
