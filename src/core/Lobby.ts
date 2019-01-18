import Arena from "../Arena";
import ArenaLoader from "../ArenaLoader";
import PlayerHandler from "../entity/PlayerHandler";
import EventHandler from "../EventHandler";
import GameStatus from "../GameStatus";
import * as PacketSender from "../PacketSender";
import Player from "../Player";
import Match from "./Match";
import MultiplayerService from "./MultiplayerService";

export default class Lobby {
    private static WAIT_BETWEEN_MATCHES = 10000;
    private static DEV_WAIT_BETWEEN_MATCHES = 2500;

    public spectators: Player[];

    private status: GameStatus;
    private service: MultiplayerService;

    private enabled: boolean;

    private match: Match | undefined;

    constructor(service: MultiplayerService) {
        this.spectators = [];

        this.status = GameStatus.WAITING;
        this.service = service;

        this.enabled = false;
    }

    public enable() {
        EventHandler.addListener(this, EventHandler.Event.CHAT_MESSAGE, this.onChatMessage);
        this.enabled = true;
    }

    public disable() {
        this.spectators = [];
        this.status = GameStatus.WAITING;
        EventHandler.removeListener(this, EventHandler.Event.CHAT_MESSAGE, this.onChatMessage);
        this.enabled = false;
    }

    public addPlayer(player: Player) {

        player.sendGameStatus(this.status);

        if (this.status === GameStatus.WAITING) {
            if (PlayerHandler.getLobbyPlayerCount(this) >= Arena.minimumPlayerCount) {
                this.startMatch();
            } else {
                this.wait();
            }
        } else if (this.status === GameStatus.RUNNING) {
            this.getMatch().addPlayer(player);
            this.spectators.push(player);
        }
    }

    public removePlayer(player: Player) {
        this.removePlayerFromLobby(player);

        if (this.status === GameStatus.RUNNING) {
            this.getMatch().removePlayer(player);

            if (this.getMatch().hasOnlyBotsRemaining()) {
                EventHandler.callEvent(EventHandler.Event.LOBBY_ONLY_BOTS_REMAINING, this);
            }

            if (!this.getMatch().hasEnoughPlayers()) {
                this.finishMatch();
            }
        }
    }

    public removePlayers(players: Player[]) {
        const removedPlayers: Player[] = [];

        // apply function didn't work in this context.
        for (const player of players) {
            removedPlayers.push(player);
        }

        for (const player of removedPlayers) {
            this.removePlayerFromLobby(player);
        }

        if (this.status === GameStatus.RUNNING) {
            for (const player of removedPlayers) {
                this.getMatch().removePlayer(player);
            }

            if (!this.getMatch().hasEnoughPlayers()) {
                this.finishMatch();
            }
        }
        return removedPlayers;
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

    public isEnabled() {
        return this.enabled;
    }

    public isBelowMinimumPlayerCount() {
        return PlayerHandler.getLobbyPlayerCount(this) < Arena.minimumPlayerCount;
    }

    public isBelowMaximumPlayerCount() {
        return PlayerHandler.getLobbyPlayerCount(this) < Arena.maximumPlayerCount;
    }

    public getSpectatorCount() {
        const playerCount = PlayerHandler.getLobbyPlayerCount(this);
        if (playerCount <= Arena.maximumPlayerCount) {
            return 0;
        } else {
            return Math.min(this.spectators.length, playerCount - Arena.maximumPlayerCount);
        }
    }

    public finishMatch() {
        this.getMatch().finish();
        PlayerHandler.removeMatch(this.getMatch());
        this.match = undefined;

        this.spectators = [];
        this.updateStatus(GameStatus.WAITING);
        if (!this.service.onMatchEnd(this)) {
            if (PlayerHandler.getLobbyPlayerCount(this) >= Arena.minimumPlayerCount) {
                this.startMatch();
            } else {
                this.wait("Not enough players to start a new match");
            }
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
        setTimeout(() => {

            const playerCount = PlayerHandler.getLobbyPlayerCount(this);
            if (playerCount >= Arena.minimumPlayerCount) {
                const arena = ArenaLoader.getArena(playerCount);

                this.createMatch(arena);

                this.updateStatus(GameStatus.RUNNING);
            } else {
                this.updateStatus(GameStatus.WAITING);
                if (!this.service.onMatchEnd(this)) {
                    this.wait("Not enough players to start a match");
                }
            }
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

    private removePlayerFromLobby(player: Player) {
        const index = this.spectators.indexOf(player);
        if (index > -1) {
            this.spectators.splice(index, 1);
        }
    }
}
