"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PacketSender = require("./PacketSender");
class Player {
    constructor(name, id) {
        this.name = name;
        this.id = id;
    }
    sendArena(arena) {
        PacketSender.sendArena(this.id, arena);
    }
    sendGameStatus(status) {
        PacketSender.sendGameStatus(this.id, status);
    }
    sendAlert(message) {
        PacketSender.sendAlert(this.id, message);
    }
    sendAssignedInitialSpawn(loc) {
        PacketSender.sendAssignedInitialSpawn(this.id, loc);
    }
}
exports.default = Player;
;
//# sourceMappingURL=Player.js.map