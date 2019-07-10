import Arena from "./Arena";

export default class VotableArena {

    public arena: Arena;
    public voteCount: number;

    constructor(arena: Arena) {
        this.arena = arena;
        this.voteCount = 0;
    }
}
