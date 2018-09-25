import Player from './Player';
import EventHandler from './EventHandler';

const players: Array<Player> = new Array();

export default class PlayerHandler{

    static enable(){
        EventHandler.addListener(undefined, EventHandler.Event.PLAYER_JOIN, PlayerHandler.onPlayerJoin, EventHandler.Level.LOW);
        EventHandler.addListener(undefined, EventHandler.Event.PLAYER_LEAVE, PlayerHandler.onPlayerLeave, EventHandler.Level.LOW);
        EventHandler.addListener(undefined, EventHandler.Event.PLAYER_SHOOT, PlayerHandler.onShoot);
    }

    static onPlayerJoin(player: Player){
        let index = players.indexOf(player);
        if(index === -1){
            players.push(player);
            console.log('player added');
        }else{
            console.warn('Attempting to add player to list that is already in list');
        }
    }

    static onPlayerLeave(data){
        let player = data.player;
        let index = players.indexOf(player);
        if(index > -1){
            players.splice(index, 1);
        }else{
            console.warn('Attempting to remove player that is not in list');
        }
    }

    static getCount(): number{
        return players.length;
    }

    static getPlayer(index: number): Player{
        return players[index];
    }

    static getIndex(player: Player): number{
        return players.indexOf(player);
    }

    private static onShoot(player: Player){
        for(let i = 0; i < players.length; i ++){
            if(players[i].id === player.id){
                players[i].sendPlayerShoot();
            }else{
                players[i].sendConnectedPlayerShoot(player.id);
            }
        }
    }
}
