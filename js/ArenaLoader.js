const EventHandler = require('./EventHandler');
const fs = require('fs');
const path = require('path');

module.exports.loadArena = () => {
        const dirPath = path.join(process.cwd(), 'arenas');
        if(fs.existsSync(dirPath)){
            const arenaFiles = fs.readdirSync(dirPath);
            if(arenaFiles.length){
                for(let arena of arenaFiles){
                    let arenaData = getArenaData(dirPath, arena);
                    if(arenaData){
                        EventHandler.callEvent(EventHandler.Event.ARENALOADER_ARENA_LOAD, arenaData);
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

    };


const getArenaData = (dirPath, fileName) => {
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
            if(hasTitle(data) && hasDimensions(data) && hasBlockLocations(data) && hasSpawns(data)){
                return data;
            }
        }
    }
    return null;
};

const hasDimensions = (data) => {
     let height = Number(data.height);
     let width = Number (data.width);
     return !(isNaN(height) || isNaN(width) || height <= 0 || width <= 0);
}

const hasTitle = (data) => {
    return data.title && data.title.length;
}

const hasBlockLocations = (data) => {
    return data.blockLocations && data.blockLocations.length;
};

const hasSpawns = (data) => {
    return data.gameSpawnLocations && data.gameSpawnLocations.length && data.initialSpawnLocations && data.initialSpawnLocations.length;
};