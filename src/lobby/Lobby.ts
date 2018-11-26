import Arena from "../Arena";
import ArenaLoader from "../ArenaLoader";
import EventHandler from "../EventHandler";
import GameStatus from "../GameStatus";
import Match from "../match/Match";
import * as PacketSender from "../PacketSender";
import Player from "../Player";

export default abstract class Lobby {

    public players: Player[];

    protected match: Match | undefined;

    private status: GameStatus;

    private readonly minimumPlayerCount = 2;

    constructor() {
        this.players = [];

        this.status = GameStatus.WAITING;

        // TODO: Refactor this to allow cleanup when multiple lobbies can be created & destroyed.
        EventHandler.addListener(this, EventHandler.Event.CHAT_MESSAGE, this.onChatMessage);
    }

    public addPlayer(player: Player) {
        this.players.push(player);

        player.sendGameStatus(this.status);

        if (this.status === GameStatus.WAITING) {
            if (this.players.length >= this.minimumPlayerCount) {
                this.startMatch();
            } else {
                this.wait();
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

            if (!(this.match as Match).hasEnoughPlayers()) {
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

    protected abstract createMatch(arena: Arena): Match;

    private startMatch() {
        this.updateStatus(GameStatus.STARTING);

        setTimeout(() => {

            if (this.players.length >= this.minimumPlayerCount) {
                const arena = ArenaLoader.getRandomArena();
                this.match = this.createMatch(arena);
                this.updateStatus(GameStatus.RUNNING);
            } else {
                this.wait("Not enough players to start a match");
            }
        }, 3000);
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

    private onChatMessage(data: any) {
        const sender: Player = data.player;
        const message: string = data.message;

        if (this.players.indexOf(sender) > -1) {
            const constructedData = JSON.stringify(this.constructChatMessage(sender, message));
            for (const player of this.players) {
                PacketSender.sendChatMessage(player.id, constructedData);
            }
        }
    }

    private constructChatMessage(sender: Player, message: string) {
        const segments = [];
        segments.push({
            color: sender.color,
            text: sender.name,
        },
        {
            color: 0xffffff,
            text: ": " + message,
        });
        return segments;
    }
}
