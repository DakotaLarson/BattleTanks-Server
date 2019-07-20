import Arena from "../arena/Arena";
import Player from "../entity/Player";
import PlayerHandler from "../entity/PlayerHandler";
import EventHandler from "../EventHandler";
import GameStatus from "../GameStatus";
import MatchTimer from "../MatchTimer";
import { GamemodeType } from "./gamemodes/GamemodeType";
import Match from "./Match";
import MultiplayerService from "./MultiplayerService";
import VoteHandler from "./VoteHandler";

export default class Lobby {

    private static readonly PUBLICITY_DELAY = 60000;
    private static readonly WAIT_BETWEEN_MATCHES = 15;
    private static readonly DEV_WAIT_BETWEEN_MATCHES = 5;
    private static readonly MATCH_TIME = 300;
    private static readonly DEV_MATCH_TIME = 30;

    public isPublic: boolean;
    public hasBots: boolean;
    public code: string | undefined;

    private status: GameStatus;
    private service: MultiplayerService;

    private match: Match | undefined;
    private matchTimer: MatchTimer | undefined;

    private startInterval: NodeJS.Timeout | undefined;

    private voteHandler: VoteHandler;

    private waitTime: number;
    private matchTime: number;

    constructor(service: MultiplayerService, fromData: boolean, isPublic: boolean, hasBots: boolean, code?: string) {
        this.status = GameStatus.WAITING;
        this.service = service;

        this.voteHandler = new VoteHandler(this);

        this.waitTime = Lobby.WAIT_BETWEEN_MATCHES;
        this.matchTime = Lobby.MATCH_TIME;
        if (process.argv.includes("dev")) {
            this.waitTime = Lobby.DEV_WAIT_BETWEEN_MATCHES;
            this.matchTime = Lobby.DEV_MATCH_TIME;
        }

        if (fromData && isPublic) {
            this.isPublic = false;
            setTimeout(() => {
                this.isPublic = isPublic;
            }, Lobby.PUBLICITY_DELAY);
        } else {
            this.isPublic = isPublic;
        }
        this.hasBots = hasBots;
        this.code = code;
    }

    public enable() {
        EventHandler.addListener(this, EventHandler.Event.CHAT_MESSAGE, this.onChatMessage);
        EventHandler.addListener(this, EventHandler.Event.MATCH_TIMER_COMPLETE, this.onMatchTimerComplete);

        this.voteHandler.enable();
    }

    public disable() {
        this.status = GameStatus.WAITING;
        EventHandler.removeListener(this, EventHandler.Event.CHAT_MESSAGE, this.onChatMessage);
        EventHandler.removeListener(this, EventHandler.Event.MATCH_TIMER_COMPLETE, this.onMatchTimerComplete);

        if (this.startInterval) {
            clearTimeout(this.startInterval);
        }

        this.voteHandler.disable();
    }

    public addPlayer(player: Player) {

        player.sendGameStatus(this.status);
        this.voteHandler.sendVoteList(player);

        let isRunning = false;
        if (this.status === GameStatus.WAITING) {
            this.startMatch();
        } else if (this.status === GameStatus.RUNNING) {
            isRunning = true;
        }

        for (const otherPlayer of PlayerHandler.getLobbyPlayers(this)) {
            if (otherPlayer !== player) {
                otherPlayer.sendConnectedPlayerJoin(player, isRunning);
                player.sendConnectedPlayerJoin(otherPlayer, false);
            } else {
                player.sendConnectedPlayerJoin(player, isRunning);
            }
        }

        if (isRunning) {
            this.getMatch().addPlayer(player);
        }

        if (this.code) {
            player.sendLobbyCode(this.code);
        }
    }

    public removePlayer(player: Player) {
        this.voteHandler.removePlayer(player);

        let sendMessage = false;
        if (this.status === GameStatus.RUNNING) {
            sendMessage = true;
            this.getMatch().removePlayer(player);

            if (!this.getMatch().hasEnoughPlayers() || !this.getMatch().hasRealPlayers()) {
                this.finishMatch(true);
            }
        }

        for (const otherPlayer of PlayerHandler.getLobbyPlayers(this)) {
            otherPlayer.sendConnectedPlayerLeave(player, sendMessage);
        }
    }

    public removePlayers(players: Player[]) {
        this.voteHandler.removePlayers();

        if (this.status === GameStatus.RUNNING) {
            for (const player of players) {
                this.getMatch().removePlayer(player);
            }

            if (!this.getMatch().hasEnoughPlayers() || !this.getMatch().hasRealPlayers()) {
                this.finishMatch(true);
            }
        }
        return players;
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

    public finishMatch(sendStats: boolean) {
        if (sendStats) {
            EventHandler.callEvent(EventHandler.Event.STATS_SEND, {
                match: this.match,
            });
        }
        this.getMatch().finish();

        PlayerHandler.removeMatch(this.getMatch());
        this.match = undefined;

        (this.matchTimer as MatchTimer).stop();
        this.matchTimer = undefined;

        this.updateStatus(GameStatus.WAITING);
        if (!this.service.onMatchEnd(this)) {
            const lobbyPlayers = PlayerHandler.getLobbyPlayers(this);
            for (const player of lobbyPlayers) {
                this.voteHandler.sendVoteList(player);
            }
            this.startMatch();
        }
    }

    private createMatch(arena: Arena) {
        this.match = new Match(arena, GamemodeType.TEAM_DEATHMATCH);
        this.matchTimer = new MatchTimer(this.matchTime, this.match);
        PlayerHandler.addMatch(this.match, this);
        this.match.run();
        this.matchTimer.start();
        this.voteHandler.generateVotableArenas();
    }
    private startMatch() {
        this.updateStatus(GameStatus.STARTING);

        let remainingTime = this.waitTime;

        const lobbyPlayers = PlayerHandler.getLobbyPlayers(this);
        for (const player of lobbyPlayers) {
            player.sendGameTimerUpdate(remainingTime);
        }

        this.startInterval = setInterval(() => {

            remainingTime --;

            const players = PlayerHandler.getLobbyPlayers(this);
            for (const player of players) {
                player.sendGameTimerUpdate(remainingTime);
            }

            if (remainingTime === 0) {
                EventHandler.callEvent(EventHandler.Event.BOTS_MATCH_START, this);
                const playerCount = PlayerHandler.getLobbyPlayerCount(this);

                if (playerCount >= Arena.minimumPlayerCount) {
                    const arena = this.voteHandler.getNextArena();
                    this.createMatch(arena);
                    this.updateStatus(GameStatus.RUNNING);
                    EventHandler.callEvent(EventHandler.Event.BOTS_AFTER_MATCH_START, {
                        lobby: this,
                        arena,
                    });
                } else {
                    this.updateStatus(GameStatus.WAITING);
                    this.service.onMatchEnd(this);
                }
                clearInterval(this.startInterval!);
                this.startInterval = undefined;
            }
        }, 1000);
    }

    private onMatchTimerComplete(match: Match) {
        if (this.match && match === this.match) {
            this.finishMatch(true);
        }
    }

    private getMatch() {
        if (this.match) {
            return this.match;
        } else {
            throw new Error("Match is undefined");
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
        const rank = sender.getRank();
        const segments = [
            {
                color: 0xff00ff,
                text: "[",
            },
            {
                color: 0xffffff,
                text: rank,
            },
            {
                color: 0xff00ff,
                text: "] ",
            },
            {
                color: sender.color,
                text: sender.name,
                profileLink: sender.sub !== undefined,
            },
            {
                color: sender.sub ? 0xffffff : 0xa0a0a0,
                text: ": " + message,
            },
        ];
        return segments;
    }
}
