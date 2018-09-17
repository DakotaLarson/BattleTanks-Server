"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Vector3 {
    constructor(x, y, z) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }
    dot(vec) {
        return vec.x * this.x + vec.y * this.y + vec.z * this.z;
    }
    cross(vec) {
        let x = this.y * vec.z - this.z * vec.y;
        let y = this.z * vec.x - this.x * vec.z;
        let z = this.x * vec.y - this.y * vec.x;
        return new Vector3(x, y, z);
    }
    getPerpendicularAboutY() {
        return new Vector3(this.z, this.y, this.x * -1);
    }
    add(vec) {
        this.x += vec.x;
        this.y += vec.y;
        this.z += vec.z;
        return this;
    }
    static fromAngleAboutY(angle) {
        return new Vector3(Math.sin(angle), 0, Math.cos(angle));
    }
}
exports.default = Vector3;
//# sourceMappingURL=Vector3.js.map