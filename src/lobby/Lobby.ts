import Arena from "../Arena";
import ArenaLoader from "../ArenaLoader";
import GameStatus from "../GameStatus";
import Match from "../match/Match";
import Player from "../Player";

export default abstract class Lobby {

    public players: Player[];

    protected match: Match | undefined;

    private status: GameStatus;

    private readonly minimumPlayerCount = 2;

    constructor() {
        this.players = [];

        this.status = GameStatus.WAITING;
    }

    public addPlayer(player: Player) {
        this.players.push(player);

        player.sendGameStatus(this.status);

        if (this.status === GameStatus.WAITING) {
            if (this.players.length >= this.minimumPlayerCount) {
                this.startMatch();
            } else {
                this.wait("Waiting for another player to start a new match");
            }
        } else if (this.status === GameStatus.RUNNING) {
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

        if (this.status === GameStatus.RUNNING) {
            (this.match as Match).removePlayer(player);

            if ((this.match as Match).getActivePlayerCount() < this.minimumPlayerCount) {
                this.finishMatch();
            }
        }

    }

    public finishMatch() {
        // TODO: send players match stats

        (this.match as Match).finish();
        this.match = undefined;
        if (this.players.length >= this.minimumPlayerCount) {
            this.startMatch();
        } else {
            this.wait("Not enough players to start a new match");
        }
    }

    protected abstract createMatch(arena: Arena, lobby: Lobby): Match;

    private startMatch() {
        this.updateStatus(GameStatus.STARTING);

        setTimeout(() => {

            if (this.players.length >= this.minimumPlayerCount) {
                const arena = ArenaLoader.getRandomArena();
                this.match = this.createMatch(arena, this);
                this.updateStatus(GameStatus.RUNNING);
            } else {
                this.wait("Not enough players to start a match");
            }
        }, 3000);

        for (const player of this.players) {
            player.sendAlert("Match starting in 3 seconds");
        }
    }

    private wait(message?: string) {
        this.updateStatus(GameStatus.WAITING);
        if (message) {
            for (const player of this.players) {
                player.sendAlert(message);
            }
        }
    }

    private updateStatus(status: GameStatus) {
        this.status = status;
        for (const player of this.players) {
            player.sendGameStatus(status);
        }
    }
}
