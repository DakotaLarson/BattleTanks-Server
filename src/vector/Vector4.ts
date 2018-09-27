import Vector3 from "./Vector3";

export default class Vector4 {

    public static fromAngleAboutY(angle: number): Vector3 {
        return new Vector3(Math.sin(angle), 0, Math.cos(angle));
    }

    public x: number;
    public y: number;
    public z: number;
    public w: number;

    constructor(x?: number, y?: number, z?: number, w?: number) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
        this.w = w || 0;
    }

    public dot(vec: Vector3): number {
         return vec.x * this.x + vec.y * this.y + vec.z * this.z;
    }

    public cross(vec: Vector3): Vector3 {

        const x = this.y * vec.z - this.z * vec.y;
        const y = this.z * vec.x - this.x * vec.z;
        const z = this.x * vec.y - this.y * vec.x;

        return new Vector3(x, y , z);
    }

    public getPerpendicularAboutY(): Vector3 {
        return new Vector3(this.z, this.y, this.x * -1);
    }

    public add(vec: Vector3): Vector3 {
        this.x += vec.x;
        this.y += vec.y;
        this.z += vec.z;
        return this;
    }

    public clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    public distanceSquared(vec: Vector3): number {
        const xDiff = vec.x - this.x;
        const yDiff = vec.y - this.y;
        const zDiff = vec.z - this.z;
        return xDiff * xDiff + yDiff * yDiff + zDiff * zDiff;
    }

}
