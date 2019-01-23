import Arena from "../Arena";
import ArenaLoader from "../ArenaLoader";
import Player from "../entity/Player";
import PlayerHandler from "../entity/PlayerHandler";
import EventHandler from "../EventHandler";
import GameStatus from "../GameStatus";
import Match from "./Match";
import MultiplayerService from "./MultiplayerService";

export default class Lobby {
    private static WAIT_BETWEEN_MATCHES = 10000;
    private static DEV_WAIT_BETWEEN_MATCHES = 2500;

    private status: GameStatus;
    private service: MultiplayerService;

    private match: Match | undefined;

    private startTimeout: NodeJS.Timeout | undefined;

    constructor(service: MultiplayerService) {

        this.status = GameStatus.WAITING;
        this.service = service;
    }

    public enable() {
        EventHandler.addListener(this, EventHandler.Event.CHAT_MESSAGE, this.onChatMessage);
    }

    public disable() {
        this.status = GameStatus.WAITING;
        EventHandler.removeListener(this, EventHandler.Event.CHAT_MESSAGE, this.onChatMessage);
        if (this.startTimeout) {
            clearTimeout(this.startTimeout);
        }
    }

    public addPlayer(player: Player) {

        player.sendGameStatus(this.status);

        if (this.status === GameStatus.WAITING) {
            this.startMatch();
        } else if (this.status === GameStatus.RUNNING) {
            this.getMatch().addPlayer(player);
        }
    }

    public removePlayer(player: Player) {
        if (this.status === GameStatus.RUNNING) {
            this.getMatch().removePlayer(player);

            if (!this.getMatch().hasEnoughPlayers() || !this.getMatch().hasRealPlayers()) {
                this.finishMatch();
            }
        }
    }

    public removePlayers(players: Player[]) {

        if (this.status === GameStatus.RUNNING) {
            for (const player of players) {
                this.getMatch().removePlayer(player);
            }

            if (!this.getMatch().hasEnoughPlayers() || !this.getMatch().hasRealPlayers()) {
                this.finishMatch();
            }
        }
        return players;
    }

    public getRandomEnemy(player: Player) {
        return this.getMatch().getRandomEnemy(player);
    }

    public getEnemies(player: Player) {
        return this.getMatch().getEnemies(player);
    }

    public isRunning() {
        return this.status === GameStatus.RUNNING;
    }

    public isStarting() {
        return this.status === GameStatus.STARTING;
    }

    public isEmpty() {
        return PlayerHandler.getLobbyPlayerCount(this) === 0;
    }

    public isBelowMinimumPlayerCount() {
        return PlayerHandler.getLobbyPlayerCount(this) < Arena.minimumPlayerCount;
    }

    public isBelowMaximumPlayerCount() {
        return PlayerHandler.getLobbyPlayerCount(this) < Arena.maximumPlayerCount;
    }

    public finishMatch() {
        this.getMatch().finish();

        PlayerHandler.removeMatch(this.getMatch());
        this.match = undefined;

        this.updateStatus(GameStatus.WAITING);
        if (!this.service.onMatchEnd(this)) {
            this.startMatch();
        }
    }

    private createMatch(arena: Arena) {
        this.match = new Match(arena);
        PlayerHandler.addMatch(this.match, this);
        this.match.run();
    }
    private startMatch() {
        this.updateStatus(GameStatus.STARTING);

        let waitTime = Lobby.WAIT_BETWEEN_MATCHES;
        if (process.argv.includes("dev")) {
            waitTime = Lobby.DEV_WAIT_BETWEEN_MATCHES;
        }

        this.startTimeout = setTimeout(() => {
            EventHandler.callEvent(EventHandler.Event.BOTS_MATCH_START, this);
            const playerCount = PlayerHandler.getLobbyPlayerCount(this);

            if (playerCount >= Arena.minimumPlayerCount) {
                const arena = ArenaLoader.getArena(playerCount);
                this.createMatch(arena);
                this.updateStatus(GameStatus.RUNNING);
                EventHandler.callEvent(EventHandler.Event.BOTS_AFTER_MATCH_START, {
                    lobby: this,
                    arena,
                });
            } else {
                this.updateStatus(GameStatus.WAITING);
                if (!this.service.onMatchEnd(this)) {
                    this.wait("Not enough players to start a match");
                }
            }
            this.startTimeout = undefined;
        }, waitTime);
    }

    private getMatch() {
        if (this.match) {
            return this.match;
        } else {
            throw new Error("Match is undefined");
        }
    }

    private wait(message?: string) {
        // Status update called previously in both cases.
        if (message) {
            for (const player of PlayerHandler.getLobbyPlayers(this)) {
                player.sendAlert(message);
            }
        }
    }

    private updateStatus(status: GameStatus) {
        this.status = status;
        for (const player of PlayerHandler.getLobbyPlayers(this)) {
            player.sendGameStatus(status);
        }
    }

    private onChatMessage(data: any) {
        const sender: Player = data.player;
        const message: string = data.message;

        if (PlayerHandler.lobbyHasPlayer(this, sender)) {
            const constructedData = JSON.stringify(this.constructChatMessage(sender, message));
            for (const player of PlayerHandler.getLobbyPlayers(this)) {
                player.sendChatMessage(constructedData);
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
