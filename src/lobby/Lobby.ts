import Arena from "../Arena";
import ArenaLoader from "../ArenaLoader";
import Match from "../match/Match";
import Player from "../Player";

export default abstract class Lobby {

    public players: Player[];

    protected match: Match | undefined;

    private status: Status;

    private readonly minimumPlayerCount = 2;

    constructor() {
        this.players = [];

        this.status = Status.WAITING;
    }

    public addPlayer(player: Player) {
        this.players.push(player);

        if (this.status === Status.WAITING) {
            if (this.players.length >= this.minimumPlayerCount) {
                this.startMatch();
            } else {
                this.wait("Waiting for another player to start a new match");
            }
        } else if (this.status === Status.STARTING) {
            // TODO: Most likely something to add here.
        } else if (this.status === Status.RUNNING) {
            (this.match as Match).addPlayer(player);
        }
    }

    public removePayer(player: Player) {
        const index = this.players.indexOf(player);
        if (index > -1) {
            this.players.splice(index, 1);
        } else {
            console.warn("Unable to remove player");
        }

        if (this.status === Status.RUNNING) {
            (this.match as Match).removePlayer(player);

            if (this.players.length < this.minimumPlayerCount) {
                this.finishMatch();
            }
        }

    }

    public finishMatch() {
        // TODO: send players match stats

        this.match = undefined;
        if (this.players.length >= this.minimumPlayerCount) {
            this.startMatch();
        } else {
            this.wait("Not enough players to start a new match");
        }
    }

    protected abstract createMatch(arena: Arena, lobby: Lobby): Match;

    private startMatch() {
        this.status = Status.STARTING;

        setTimeout(() => {

            if (this.players.length >= this.minimumPlayerCount) {
                const arena = ArenaLoader.getRandomArena();
                this.match = this.createMatch(arena, this);
                this.status = Status.RUNNING;
            } else {
                this.wait("Not enough players to start a match");
            }
        }, 3000);

        for (const player of this.players) {
            player.sendAlert("Match starting in 3 seconds");
        }
    }

    private wait(message?: string) {
        this.status = Status.WAITING;

        if (message) {
            for (const player of this.players) {
                player.sendAlert(message);
            }
        }
    }

}

enum Status {
    WAITING,
    STARTING,
    RUNNING,
}
