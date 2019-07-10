enum Global {
    ARENAS,
}

export default class Globals {

    public static get Global() {
        return Global;
    }

    private static values: Map<Global, any> = new Map();

    public static setGlobal(global: Global, value: any) {
        Globals.values.set(global, value);
    }

    public static getGlobal(global: Global) {
        return Globals.values.get(global);
    }
}
