export default class Vector3{

    x: number;
    y: number;
    z: number;
    
    constructor(x?, y?, z?){
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }

    dot(vec: Vector3): number{
         return vec.x * this.x + vec.y * this.y + vec.z * this.z;
    }

    cross(vec: Vector3): Vector3{

		let x = this.y * vec.z - this.z * vec.y;
		let y = this.z * vec.x - this.x * vec.z;
		let z = this.x * vec.y - this.y * vec.x;

		return new Vector3(x, y ,z);
	}

    getPerpendicularAboutY(): Vector3{
        return new Vector3(this.z, this.y, this.x * -1);
    }

    add(vec: Vector3): Vector3{
        this.x += vec.x;
        this.y += vec.y;
        this.z += vec.z;
        return this;
    }

    clone(){
        return new Vector3(this.x, this.y, this.z);
    }

    distanceSquared(vec: Vector3): number{
        let xDiff = vec.x - this.x;
        let yDiff = vec.y - this.y;
        let zDiff = vec.z - this.z;
        return xDiff * xDiff + yDiff * yDiff + zDiff * zDiff;
    }

    static fromAngleAboutY(angle: number): Vector3{
        return new Vector3(Math.sin(angle), 0, Math.cos(angle));
    }

}