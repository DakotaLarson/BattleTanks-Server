import EventHandler from './EventHandler';
import Player from './Player';

export default class PlayerShootHandler{

    static enable(){
        EventHandler.addListener(null, EventHandler.Event.PLAYER_SHOOT, PlayerShootHandler.onPlayerShoot);
    }

    static onPlayerShoot(player: Player){
        console.log('shot fired ' + player.id);
    }
}