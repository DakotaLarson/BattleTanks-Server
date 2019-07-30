import Player from "../../entity/Player";
import PlayerHandler from "../../entity/PlayerHandler";
import EventHandler from "../../main/EventHandler";
import Audio from "../Audio";
import Match from "../Match";
import Gamemode from "./Gamemode";
import { GamemodeType } from "./GamemodeType";

export default class TeamElimination extends Gamemode {

    private static readonly LIFE_COUNT = 3;

    private lives: Map<number, number>;

    constructor(match: Match) {
        super(match);
        this.lives = new Map();

    }
    public enable(): void {
        super.enable();

        for (const player of PlayerHandler.getMatchPlayers(this.match)) {
            this.lives.set(player.id, TeamElimination.LIFE_COUNT);
        }
    }

    public disable(): void {
        super.disable();

        this.lives.clear();
    }

    public getType() {
        return GamemodeType.TEAM_ELIMINATION;
    }

    public isPlayerValid(player: Player) {
        const lives = this.lives.get(player.id);
        return lives !== undefined && (player.isAlive || lives > 0);
    }

    protected killPlayer(target: Player, playerId: number) {
        let livesRemaining = this.lives.get(target.id) as number;

        livesRemaining --;
        target.despawn(playerId, livesRemaining);

        for (const otherPlayer of PlayerHandler.getMatchPlayers(this.match)) {
            if (otherPlayer !== target) {
                otherPlayer.sendConnectedPlayerRemoval(target.id, playerId, livesRemaining);
            }
        }

        EventHandler.callEvent(EventHandler.Event.STATS_KILL, {
            match: this.match,
            player: target.id,
            shooter: playerId,
        });

        this.lives.set(target.id, livesRemaining);
        if (livesRemaining !== 0) {
            this.respawn(target);
        } else {
            this.onFinalDeath(target);
        }

    }

    private onFinalDeath(target: Player) {
        // Check if there are valid players on KO'd player's team.
        if (this.match.hasRealPlayers()) {
            for (const player of PlayerHandler.getMatchPlayers(this.match)) {
                if ((this.match as Match).onSameTeam(player, target)) {
                    if (this.isPlayerValid(player)) {
                        target.sendAudioRequest(Audio.DEATH_NORESPAWN);
                        target.sendPlayerSpectating();

                        return;
                    }
                }
            }
        }

        // for (const player of PlayerHandler.getMatchPlayers(this.match)) {
        //     if ((this.match as Match).onSameTeam(player, target)) {
        //         player.sendAudioRequest(Audio.LOSE);
        //     } else {
        //         player.sendAudioRequest(Audio.WIN);
        //     }
        // }

        EventHandler.callEvent(EventHandler.Event.STATS_SEND, {
            match: this.match,
            playerId: target.id,
        });
        const lobby = PlayerHandler.getMatchLobby(this.match);
        lobby.finishMatch(false);
    }
}
