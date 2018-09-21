"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventHandler_1 = require("./EventHandler");
const Arena_1 = require("./Arena");
const fs = require('fs');
const path = require('path');
class ArenaLoader {
    static loadArena() {
        const dirPath = path.join(process.cwd(), 'arenas');
        if (fs.existsSync(dirPath)) {
            const arenaFiles = fs.readdirSync(dirPath);
            if (arenaFiles.length) {
                for (let arena of arenaFiles) {
                    let arenaData = ArenaLoader.getArenaData(dirPath, arena);
                    if (arenaData) {
                        ArenaLoader.loadedArena = new Arena_1.default(arenaData);
                        EventHandler_1.default.callEvent(EventHandler_1.default.Event.ARENALOADER_ARENA_LOAD, ArenaLoader.loadedArena);
                        return;
                    }
                }
                EventHandler_1.default.callEvent(EventHandler_1.default.Event.ARENALOADER_NO_ARENAS);
            }
            else {
                EventHandler_1.default.callEvent(EventHandler_1.default.Event.ARENALOADER_NO_ARENAS);
            }
        }
        else {
            fs.mkdirSync(dirPath);
            EventHandler_1.default.callEvent(EventHandler_1.default.Event.ARENALOADER_NO_ARENAS);
        }
    }
    static getLoadedArena() {
        return ArenaLoader.loadedArena;
    }
    static getArenaData(dirPath, fileName) {
        const filePath = path.join(dirPath, fileName);
        if (fileName.endsWith('.json')) {
            if (fs.lstatSync(filePath).isFile()) {
                const contents = fs.readFileSync(filePath, 'utf8');
                let data = null;
                try {
                    data = JSON.parse(contents);
                }
                catch (ex) {
                    return null;
                }
                if (ArenaLoader.hasTitle(data) && ArenaLoader.hasDimensions(data) && ArenaLoader.hasBlockLocations(data) && ArenaLoader.hasPlayerSpawns(data)) {
                    return data;
                }
            }
        }
        return null;
    }
    static hasDimensions(data) {
        let height = Number(data.height);
        let width = Number(data.width);
        return !(isNaN(height) || isNaN(width) || height <= 0 || width <= 0);
    }
    static hasTitle(data) {
        return data.title && data.title.length;
    }
    static hasBlockLocations(data) {
        return data.blockLocations && data.blockLocations.length;
    }
    static hasPlayerSpawns(data) {
        return data.gameSpawnLocations && data.gameSpawnLocations.length && data.initialSpawnLocations && data.initialSpawnLocations.length;
    }
}
exports.default = ArenaLoader;
//# sourceMappingURL=ArenaLoader.js.map