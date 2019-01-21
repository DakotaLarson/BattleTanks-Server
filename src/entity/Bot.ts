import Player from "./Player";

export default class Bot extends Player {

    constructor(id: number) {
        super("Guest", id);
    }

    public isBot() {
        return true;
    }
}
