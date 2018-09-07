"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PacketSender = require("./PacketSender");
const Vector3_1 = require("./Vector3");
class Player {
    constructor(name, id) {
        this.name = name;
        this.id = id;
        this.pos = new Vector3_1.default();
        this.bodyRot = 0;
        this.headRot = 0;
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
        this.pos.x = loc.x;
        this.pos.y = loc.y;
        this.pos.z = loc.z;
        PacketSender.sendAssignedInitialSpawn(this.id, loc);
    }
    handlePositionUpdate(data) {
        this.pos.x = data[0];
        this.pos.y = data[1];
        this.pos.z = data[2];
        this.bodyRot = data[3];
        this.headRot = data[4];
    }
}
exports.default = Player;
;
//# sourceMappingURL=Player.js.map