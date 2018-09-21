import EventHandler from './EventHandler';
import Arena from './Arena';

const fs = require('fs');
const path = require('path');

export default class ArenaLoader{

    private static loadedArena: Arena;

    static loadArena(){
        const dirPath = path.join(process.cwd(), 'arenas');
        if(fs.existsSync(dirPath)){
            const arenaFiles = fs.readdirSync(dirPath);
            if(arenaFiles.length){
                for(let arena of arenaFiles){
                    let arenaData = ArenaLoader.getArenaData(dirPath, arena);
                    if(arenaData){
                        ArenaLoader.loadedArena = new Arena(arenaData);
                        EventHandler.callEvent(EventHandler.Event.ARENALOADER_ARENA_LOAD, ArenaLoader.loadedArena);
                        return;
                    }
                }
                EventHandler.callEvent(EventHandler.Event.ARENALOADER_NO_ARENAS);
            }else{
                EventHandler.callEvent(EventHandler.Event.ARENALOADER_NO_ARENAS);
            }
        }else{
            fs.mkdirSync(dirPath);
            EventHandler.callEvent(EventHandler.Event.ARENALOADER_NO_ARENAS);
        }
    }

    static getLoadedArena(){
        return ArenaLoader.loadedArena;
    }

    private static getArenaData(dirPath, fileName){
        const filePath = path.join(dirPath, fileName);
        if(fileName.endsWith('.json')){
            if(fs.lstatSync(filePath).isFile()){
                const contents = fs.readFileSync(filePath, 'utf8');
                let data = null;
                try{
                    data = JSON.parse(contents);
                }catch(ex){
                    return null;
                }
                if(ArenaLoader.hasTitle(data) && ArenaLoader.hasDimensions(data) && ArenaLoader.hasBlockLocations(data) && ArenaLoader.hasPlayerSpawns(data)){
                    return data;
                }
            }
        }
        return null;
    }

    private static hasDimensions(data){
        let height = Number(data.height);
        let width = Number (data.width);
        return !(isNaN(height) || isNaN(width) || height <= 0 || width <= 0);
    }

    private static hasTitle(data){
        return data.title && data.title.length;
    }

    private static hasBlockLocations(data){
        return data.blockLocations && data.blockLocations.length;
    }

    private static hasPlayerSpawns(data){
        return data.gameSpawnLocations && data.gameSpawnLocations.length && data.initialSpawnLocations && data.initialSpawnLocations.length;
    }
}

