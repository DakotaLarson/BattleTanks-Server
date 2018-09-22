import EventHandler from './EventHandler';
import PlayerHandler from './PlayerHandler';
import Audio from './Audio';

export default class PlayerKillHandler{

    static enable(){
        EventHandler.addListener(PlayerKillHandler, EventHandler.Event.PLAYER_HIT_PLAYER, PlayerKillHandler.onHit, EventHandler.Level.LOW);
    }

    static onHit(data){
        data.target.sendAlert('You were killed by: ' + data.player.name);
        data.player.sendAlert('You killed: ' + data.target.name);

        data.target.sendAudioRequest(Audio.LOSE);

        data.target.isAlive = false;
        let targetId = data.target.id;
        for(let i = 0; i < PlayerHandler.getCount(); i ++){
            let player = PlayerHandler.getPlayer(i);
            if(player.id === targetId){
                player.sendPlayerRemoval();
                
            }else{
                player.sendConnectedPlayerRemoval(targetId);
            }
        }
    }
}