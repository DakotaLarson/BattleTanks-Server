import Player from "../../entity/Player";
import PlayerHandler from "../../entity/PlayerHandler";
import EventHandler from "../../main/EventHandler";
import Match from "../Match";
import Gamemode from "./Gamemode";
import { GamemodeType } from "./GamemodeType";

export default class TeamDeathmatch extends Gamemode {

    private static readonly LIVES_REMAINING = -1;

    constructor(match: Match) {
        super(match);
    }

    public enable() {
        super.enable();
    }

    public disable(): void {
        super.disable();
    }

    public getType() {
        return GamemodeType.TEAM_DEATHMATCH;
    }

    public isPlayerValid(player: Player): boolean {
        return true;
    }

    protected killPlayer(target: Player, playerId: number): void {

        target.despawn(playerId, TeamDeathmatch.LIVES_REMAINING);

        for (const otherPlayer of PlayerHandler.getMatchPlayers(this.match)) {
            if (otherPlayer !== target) {
                otherPlayer.sendConnectedPlayerRemoval(target.id, playerId, TeamDeathmatch.LIVES_REMAINING);
            }
        }

        EventHandler.callEvent(EventHandler.Event.STATS_KILL, {
            match: this.match,
            player: target.id,
            shooter: playerId,
        });

        this.respawn(target);
    }

}
