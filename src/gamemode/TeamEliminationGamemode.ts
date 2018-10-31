import Player from "../Player";
import Gamemode from "./Gamemode";

export default class TeamEliminationGamemode extends Gamemode {

    public enable(): void {
        throw new Error("Method not implemented.");
    }

    public disable(): void {
        throw new Error("Method not implemented.");
    }

    protected onDeath(target: Player, player: Player): void {
        throw new Error("Method not implemented.");
    }

}
