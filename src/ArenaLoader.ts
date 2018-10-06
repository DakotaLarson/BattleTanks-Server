import Arena from "./Arena";

import * as fs from "fs";
import * as path from "path";

export default class ArenaLoader {

    public static loadArena(): Promise<string> {
        return new Promise((resolve, reject) => {

            const dirPath = path.join(process.cwd(), "arenas");

            fs.exists(dirPath, (exists) => {

                if (exists) {
                    fs.readdir(dirPath, (err: NodeJS.ErrnoException, arenaFiles: string[]) => {
                        if (err) {

                            console.error(err);
                            resolve("Error reading from 'arenas' directory");

                        } else {

                            if (arenaFiles.length) {
                                for (const arena of arenaFiles) {

                                    const arenaData = ArenaLoader.getArenaData(dirPath, arena);

                                    if (arenaData) {
                                        ArenaLoader.loadedArena = new Arena(arenaData);
                                        resolve();
                                    }
                                }
                                reject("No valid arenas on server");
                            } else {

                                reject("No arenas on server");

                            }
                        }
                    });
                } else {

                    fs.mkdir(dirPath, undefined, (err: NodeJS.ErrnoException) => {
                        if (err) {
                            console.error(err);
                        }
                    });
                    reject("No 'arenas' directory nor arenas on server");

                }
            });
        });
    }

    public static getLoadedArena() {
        return ArenaLoader.loadedArena;
    }

    private static loadedArena: Arena;

    private static getArenaData(dirPath: string, fileName: string) {
        const filePath = path.join(dirPath, fileName);
        if (fileName.endsWith(".json")) {
            if (fs.lstatSync(filePath).isFile()) {
                const contents = fs.readFileSync(filePath, "utf8");
                let data;
                try {
                    data = JSON.parse(contents);
                } catch (ex) {
                    return undefined;
                }
                if (ArenaLoader.hasTitle(data) && ArenaLoader.hasDimensions(data) && ArenaLoader.hasBlockPositions(data) && ArenaLoader.hasPlayerSpawns(data)) {
                    return data;
                }
            }
        }
        return undefined;
    }

    private static hasDimensions(data: any) {
        const height = Number(data.height);
        const width = Number (data.width);
        return !(isNaN(height) || isNaN(width) || height <= 0 || width <= 0);
    }

    private static hasTitle(data: any) {
        return data.title && data.title.length;
    }

    private static hasBlockPositions(data: any) {
        return data.blockPositions && data.blockPositions.length;
    }

    private static hasPlayerSpawns(data: any) {
        return data.gameSpawnPositions && data.gameSpawnPositions.length && data.initialSpawnPositions && data.initialSpawnPositions.length;
    }
}
