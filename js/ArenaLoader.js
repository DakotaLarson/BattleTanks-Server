const EventHandler = require('./EventHandler');
const fs = require('fs');
const path = require('path');

module.exports.loadArena = () => {
        const dirPath = path.join(process.cwd(), 'arenas');
        const arenaFiles = fs.readdirSync(dirPath);
        if(arenaFiles.length){
            for(let arena of arenaFiles){
                let arenaData = getArenaData(dirPath, arena);
                if(arenaData){
                    EventHandler.callEvent(EventHandler.Event.ARENALOADER_ARENA_LOAD, arenaData);
                    return;
                }
            }
            EventHandler.callEvent(EventHandler.Event.ARENALOADER_ARENA_LOAD);
        }else{
            EventHandler.callEvent(EventHandler.Event.ARENALOADER_ARENA_LOAD);
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
            if(data.title && !isNaN(Number(data.height)) && !isNaN(Number(data.width)) && data.blockLocations){
                return data;
            }
        }
    }
    return null;
};
