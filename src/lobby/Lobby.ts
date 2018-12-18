import Arena from "../Arena";
import ArenaLoader from "../ArenaLoader";
import EventHandler from "../EventHandler";
import GameStatus from "../GameStatus";
import Match from "../match/Match";
import * as PacketSender from "../PacketSender";
import Player from "../Player";
import MultiplayerService from "../service/MultiplayerService";

export default abstract class Lobby {

    public players: Player[];
    public spectators: Player[];

    protected match: Match | undefined;

    private status: GameStatus;
    private service: MultiplayerService;

    private readonly minimumPlayerCount = 2;

    constructor(service: MultiplayerService) {
        this.players = [];
        this.spectators = [];

        this.status = GameStatus.WAITING;
        this.service = service;
    }

    public enable() {
        EventHandler.addListener(this, EventHandler.Event.CHAT_MESSAGE, this.onChatMessage);
    }

    public disable() {
        if (this.match) {
            throw new Error("Cannot disable lobby when match exists");
        }
        this.players = [];
        this.spectators = [];
        this.status = GameStatus.WAITING;
        EventHandler.removeListener(this, EventHandler.Event.CHAT_MESSAGE, this.onChatMessage);
    }

    public hasPlayer(player: Player) {
        return this.players.indexOf(player) > -1;
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
            this.spectators.push(player);
        }
    }

    public removePayer(player: Player) {
        let index = this.players.indexOf(player);
        if (index > -1) {
            this.players.splice(index, 1);
        } else {
            console.warn("Unable to remove player");
        }

        index = this.spectators.indexOf(player);
        if (index > -1) {
            this.spectators.splice(index, 1);
        }

        if (this.status === GameStatus.RUNNING) {
            if (this.match === undefined) {
                console.warn("match is null");
                return;
            }
            (this.match as Match).removePlayer(player);

            if (!(this.match as Match).hasEnoughPlayers()) {
                this.finishMatch();
            }
        }

    }

    public isRunning() {
        return this.status === GameStatus.RUNNING;
    }

    public isStarting() {
        return this.status === GameStatus.STARTING;
    }

    public isEmpty() {
        return this.players.length === 0;
    }

    public isBelowMinimumPlayerCount() {
        return this.players.length < Arena.minimumPlayerCount;
    }

    public isBelowRecommendedPlayerCount() {
        return this.players.length < Arena.recommendedPlayerCount;
    }

    public isBelowMaximumPlayerCount() {
        return this.players.length < Arena.maximumPlayerCount;
    }

    public getSpectatorCount() {
        if (this.players.length <= Arena.recommendedPlayerCount) {
            return 0;
        } else {
            return Math.min(this.spectators.length, this.players.length - Arena.recommendedPlayerCount);
        }
    }

    public finishMatch() {
        // TODO: send players match stats

        (this.match as Match).finish();
        this.match = undefined;
        this.spectators = [];
        this.updateStatus(GameStatus.WAITING);
        if (!this.service.onMatchEnd(this)) {
            if (this.players.length >= this.minimumPlayerCount) {
                this.startMatch();
            } else {
                this.wait("Not enough players to start a new match");
            }
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
                this.updateStatus(GameStatus.WAITING);
                if (!this.service.onMatchEnd(this)) {
                    this.wait("Not enough players to start a match");
                }
            }
        }, 3000);
    }

    private wait(message?: string) {
        // this.updateStatus(GameStatus.WAITING); previously called in both cases.
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
