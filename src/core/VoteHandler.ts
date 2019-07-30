import Arena from "../arena/Arena";
import VotableArena from "../arena/VotableArena";
import Player from "../entity/Player";
import PlayerHandler from "../entity/PlayerHandler";
import EventHandler from "../main/EventHandler";
import Globals from "../main/Globals";
import Lobby from "./Lobby";

export default class VoteHandler {

    private static readonly VOTABLE_ARENA_COUNT = 3;

    private lobby: Lobby;

    private previousArena: Arena | undefined;

    private votableArenas: VotableArena[];
    private randomArenaVoteCount: number;

    private playerVotes: Map<Player, VotableArena | undefined>;

    constructor(lobby: Lobby) {
        this.lobby = lobby;
        this.votableArenas = [];

        this.playerVotes = new Map();

        this.randomArenaVoteCount = 0;
    }

    public enable() {
        EventHandler.addListener(this, EventHandler.Event.PLAYER_VOTE, this.onPlayerVote);

        this.generateVotableArenas();
    }

    public disable() {
        EventHandler.removeListener(this, EventHandler.Event.PLAYER_VOTE, this.onPlayerVote);
    }

    public generateVotableArenas() {
        const count = VoteHandler.VOTABLE_ARENA_COUNT;
        const previousArena = this.previousArena;
        const votableArenas: VotableArena[] = [];
        const arenas = Globals.getGlobal(Globals.Global.ARENAS) as Arena[];

        if (count > arenas.length) {
            throw new Error("Too many votable arenas requested.");
        } else if (count === arenas.length) {

            for (const arena of arenas) {
                votableArenas.push(new VotableArena(arena));
            }

        } else {
            const availableArenas = arenas.slice();

            let previousArenaIndex = -1;
            if (previousArena) {
                previousArenaIndex = availableArenas.indexOf(previousArena);
            }

            if (previousArenaIndex !== -1) {
                availableArenas.splice(previousArenaIndex, 1);
            }

            this.shuffle(availableArenas);
            for (let i = 0; i < count; i ++) {
                votableArenas.push(new VotableArena(availableArenas[i]));
            }
        }

        this.votableArenas = votableArenas;
        this.randomArenaVoteCount = 0;
        this.playerVotes.clear();
    }

    public getNextArena() {
        const nextVotableArena = this.getNextVotableArena();
        let nextArena = nextVotableArena.arena;

        if (nextVotableArena.voteCount < this.randomArenaVoteCount || nextVotableArena.voteCount === this.randomArenaVoteCount && Math.random() > 0.5) {
            nextArena = this.getRandomArena();
        }

        return nextArena;
    }

    public sendVoteList(player: Player) {
        const voteList = [];
        for (const votableArena of this.votableArenas) {
            voteList.push({
                voteCount: votableArena.voteCount,
                title: votableArena.arena.title,
                author: votableArena.arena.author,
            });
        }

        voteList.push({
            voteCount: this.randomArenaVoteCount,
            title: "Random Arena",
        });
        player.sendVoteList(voteList);
    }

    public removePlayer(player: Player) {
        this.removeVote(player);
    }

    public removePlayers() {
        for (const votableArena of this.votableArenas) {
            votableArena.voteCount = 0;
        }
        this.randomArenaVoteCount = 0;

        this.playerVotes.clear();
    }

    private onPlayerVote(event: any) {
        const player: Player = event.player;
        const vote: number = event.vote;

        if (PlayerHandler.lobbyHasPlayer(this.lobby, player) && vote <= this.votableArenas.length && vote >= 0) {
            this.removeVote(player);
            if (vote === this.votableArenas.length) {
                this.addVote(player);
            } else {
                this.addVote(player, this.votableArenas[vote]);
            }

            this.updatePlayers();
        }
    }

    private removeVote(player: Player) {
        if (this.playerVotes.has(player)) {
            const arena = this.playerVotes.get(player);
            if (arena) {
                arena.voteCount --;
            } else {
                this.randomArenaVoteCount --;
            }

            this.playerVotes.delete(player);
        }
    }

    private addVote(player: Player, votableArena?: VotableArena) {
        if (votableArena) {
            votableArena.voteCount ++;
        } else {
            this.randomArenaVoteCount ++;
        }

        this.playerVotes.set(player, votableArena);
    }

    private updatePlayers() {
        const voteCounts = [];
        for (const votableArena of this.votableArenas) {
            voteCounts.push(votableArena.voteCount);
        }
        voteCounts.push(this.randomArenaVoteCount);

        const players = PlayerHandler.getLobbyPlayers(this.lobby);
        for (const player of players) {
            player.sendVoteUpdate(voteCounts);
        }
    }

    private getNextVotableArena() {
        if (this.votableArenas.length) {
            let selectedArena = this.votableArenas[0];

            for (let i = 1; i < this.votableArenas.length; i++) {
                if (this.votableArenas[i].voteCount > selectedArena.voteCount || this.votableArenas[i].voteCount === selectedArena.voteCount && Math.random() > 0.5) {
                    selectedArena = this.votableArenas[i];
                }
            }

            this.previousArena = selectedArena.arena;

            return selectedArena;

        } else {
            throw new Error("No votable arenas supplied");
        }
    }

    private getRandomArena() {
        const arenas = (Globals.getGlobal(Globals.Global.ARENAS) as Arena[]).slice();

        if (this.previousArena) {
            const previousArenaIndex = arenas.indexOf(this.previousArena);
            if (previousArenaIndex > -1) {
                arenas.splice(previousArenaIndex, 1);
            }
        }

        if (arenas.length <= this.votableArenas.length) {
            return arenas[Math.floor(Math.random() * arenas.length)];
        }

        for (const votableArena of this.votableArenas) {
            const arenaIndex = arenas.indexOf(votableArena.arena);
            if (arenaIndex > -1) {
                arenas.splice(arenaIndex, 1);
            }
        }

        return arenas[Math.floor(Math.random() * arenas.length)];
    }

    private shuffle(arr: any[]) {
        for (let i = 0; i < arr.length; i ++) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
}
