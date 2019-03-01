export default class Vector3 {

    public x: number;
    public y: number;
    public z: number;

    constructor(x?: number, y?: number, z?: number) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }

    public static fromAngleAboutY(angle: number): Vector3 {
        return new Vector3(Math.sin(angle), 0, Math.cos(angle));
    }

    public static multiplyVectors(a: Vector3, b: Vector3) {
        return new Vector3(a.x * b.x, a.y * b.y, a.z * b.z);
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
        return this.cross(new Vector3(0, 1, 0));

    }

    public add(vec: Vector3): Vector3 {
        this.x += vec.x;
        this.y += vec.y;
        this.z += vec.z;
        return this;
    }

    public sub(vec: Vector3): Vector3 {
        this.x -= vec.x;
        this.y -= vec.y;
        this.z -= vec.z;
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

    public multiplyScalar(scalar: number): Vector3 {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    public floor(): Vector3 {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        this.z = Math.floor(this.z);
        return this;
    }

    public lengthSq(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    public length() {
        return Math.sqrt(this.lengthSq());
    }

    public equals(vec: Vector3): boolean {
        return this.x === vec.x && this.y === vec.y && this.z === vec.z;
    }

    public distance(vec: Vector3): number {
        const xDiff = vec.x - this.x;
        const yDiff = vec.y - this.y;
        const zDiff = vec.z - this.z;

        return Math.sqrt(xDiff * xDiff + yDiff * yDiff + zDiff * zDiff);
    }

    public normalize() {
        const length = this.length() || 1;
        this.x /= length;
        this.y /= length;
        this.z /= length;
        return this;
    }

}
