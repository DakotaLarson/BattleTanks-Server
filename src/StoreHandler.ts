import StoreDatabaseHandler from "./database/StoreDatabaseHandler";

enum ProductType {
    TANK,
    COLOR,
}
export default class StoreHandler {

    private databaseHandler: StoreDatabaseHandler;

    constructor(databaseHandler: StoreDatabaseHandler) {
        this.databaseHandler = databaseHandler;
    }

    public async getStore(id: string) {
        const products = await this.databaseHandler.getProducts();
        const purchases = await this.databaseHandler.getPurchases(id);
        const selections = await this.databaseHandler.getSelections(id);

        const tanks: any = [];
        const colors: any = [];

        for (const product of products) {
            let purchased = false;
            let selectionIndex = -1;

            for (const purchase of purchases) {
                if (purchase.product === product.id) {
                    purchased = true;
                    break;
                }
            }

            for (const selection of selections) {
                if (selection.product === product.id) {
                    selectionIndex = selection.position;
                    break;
                }
            }

            const productData = {
                title: product.title,
                price: product.price,
                detail: product.detail,
                parent_required: product.parent_required ? true : false,
                level_required: product.level_required,
                image_url: product.image_url,
                purchased,
                selectionIndex,
            };

            if (product.type === ProductType.TANK) {
                tanks.push(productData);
            } else if (product.type === ProductType.COLOR) {
                colors.push(productData);
            }
        }

        return {
            tanks,
            colors,
        };
    }
}
