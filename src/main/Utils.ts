export default class Utils {

    public static generateCode(length: number): string {
        const inclusiveMin = 65; // ASCII code 'A'
        const exclusiveMax = 91; // ASCII code after 'Z'
        const diff = exclusiveMax - inclusiveMin;

        const codes = [];
        for (let i = 0; i < length; i ++) {
            codes.push(Math.floor(Math.random() * diff) + inclusiveMin);
        }

        return String.fromCharCode.apply(this, (codes));
    }
}
