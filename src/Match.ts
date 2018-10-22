import Arena from "./Arena";
import Gamemode from "./Gamemode";
import Player from "./Player";

export default class Match {

    private arena: Arena;
    private gamemode: Gamemode;
    private players: Player[];

    constructor(arena: Arena, gamemode: Gamemode) {
        this.arena = arena;
        this.gamemode = gamemode;
        this.players = [];
    }
}
