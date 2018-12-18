import * as fs from "fs";
import * as path from "path";
import Arena from "./Arena";

export default class ArenaLoader {

    public static loadArenas(): Promise<string> {
        return new Promise((resolve, reject) => {

            ArenaLoader.arenas = [];

            Arena.maximumPlayerCount = 0;
            Arena.recommendedPlayerCount = 0;
            Arena.minimumPlayerCount = Number.MAX_SAFE_INTEGER;

            const dirPath = path.join(process.cwd(), "arenas");

            fs.exists(dirPath, (exists) => {

                if (exists) {
                    fs.readdir(dirPath, (err: NodeJS.ErrnoException, arenaFiles: string[]) => {
                        if (err) {

                            console.error(err);
                            reject("Error reading from 'arenas' directory");

                        } else {

                            let expectedArenaCount = arenaFiles.length;
                            if (expectedArenaCount) {
                                let loadedArenaCount = 0;

                                for (const arena of arenaFiles) {

                                    ArenaLoader.getArenaData(dirPath, arena).then((arenaData: string) => {
                                        this.arenas.push(new Arena(arenaData));
                                        if (++ loadedArenaCount === expectedArenaCount) {
                                            console.log("Recommended Limit: " + Arena.recommendedPlayerCount);
                                            console.log("Maximum Limit: " + Arena.maximumPlayerCount);
                                            console.log("Minimum Limit: " + Arena.minimumPlayerCount);

                                            resolve(loadedArenaCount + " arena(s) loaded");
                                        }
                                    }).catch((message: string) => {
                                        console.error(message);
                                        if (-- expectedArenaCount === loadedArenaCount) {
                                            resolve(loadedArenaCount + " arena(s) loaded");
                                        }
                                    });
                                }
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

    public static getRandomArena(): Arena {
        const arenaCount = ArenaLoader.arenas.length;
        if (arenaCount) {
            const index = Math.floor(Math.random() * arenaCount);
            return ArenaLoader.arenas[index];
        } else {
            throw new Error("No arenas loaded on server");
        }
    }

    public static getArena(playerCount: number): Arena {
        if (ArenaLoader.arenas.length) {
            const validArenas = [];

            // Get all arenas that can fit players
            let useRecommendedLimit = false;
            for (const arena of ArenaLoader.arenas) {
                if (arena.maximumPlayerCount >= playerCount && arena.minimumPlayerCount <= playerCount) {
                    if (arena.recommendedPlayerCount >= playerCount) {
                        // At least one arena can hold players using the recommended limit.
                        useRecommendedLimit = true;
                    }
                    validArenas.push(arena);
                }
            }

            if (useRecommendedLimit) {
                for (const arena of validArenas) {
                    if (arena.recommendedPlayerCount < playerCount) {
                        // The arena would be over recommended capacity.
                        validArenas.splice(validArenas.indexOf(arena), 1);
                    }
                }
            }

            if (!validArenas.length) {
                throw new Error("No arenas can hold player count: " + playerCount);
            }

            let selectedArena = validArenas[0];
            let selectedArenaDiff = (useRecommendedLimit ? selectedArena.recommendedPlayerCount : selectedArena.maximumPlayerCount) - playerCount;

            for (let i = 1; i < validArenas.length; i ++) {
                const arena = validArenas[i];
                const arenaDiff = (useRecommendedLimit ? arena.recommendedPlayerCount : arena.maximumPlayerCount) - playerCount;
                if (arenaDiff < selectedArenaDiff) {
                    selectedArena = arena;
                    selectedArenaDiff = arenaDiff;
                } else if (arenaDiff === selectedArenaDiff && Math.random() >= 0.5) {
                    selectedArena = arena;
                }
            }

            return selectedArena;
        } else {
            throw new Error("No arenas loaded on server");
        }
    }

    private static arenas: Arena[] = [];

    private static getArenaData(dirPath: string, fileName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const filePath = path.join(dirPath, fileName);
            if (fileName.endsWith(".json")) {
                fs.readFile(filePath, (err: NodeJS.ErrnoException, rawData: Buffer) => {
                    if (err) {
                        console.error(err);
                        reject("Error reading file " + fileName);
                    }

                    let data;
                    try {
                        data = JSON.parse(rawData.toString());
                    } catch (ex) {
                        console.error(ex);
                        reject("Error parsing content in " + fileName);
                    }
                    if (ArenaLoader.hasTitle(data) && ArenaLoader.hasDimensions(data) && ArenaLoader.hasBlockPositions(data) && ArenaLoader.hasPlayerSpawns(data) && ArenaLoader.hasPlayerCounts(data)) {
                        resolve(data);
                    } else {
                        reject("Missing required fields in " + fileName);
                    }
                });
            } else {
                reject(fileName + " has improper file extension");
            }
        });
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

        const hasTeamASpawns = data.teamASpawnPositions && data.teamASpawnPositions.length;
        const hasTeamBSpawns = data.teamBSpawnPositions && data.teamBSpawnPositions.length;

        return hasTeamASpawns && hasTeamBSpawns;
    }

    private static hasPlayerCounts(data: any) {
        return data.minimumPlayerCount && data.minimumPlayerCount >= 2 &&
            data.recommendedPlayerCount && data.recommendedPlayerCount >= data.minimumPlayerCount &&
            data.maximumPlayerCount && data.maximumPlayerCount >= data.recommendedPlayerCount + 2;
    }
}
