import * as mysql from "mysql";
import DatabaseHandler from "./DatabaseHandler";

export default class DatabaseUtils {

    private pool: mysql.Pool | undefined;

    public setPool(pool: mysql.Pool) {
        this.pool = pool;
    }

    public query(sql: string, values?: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            this.pool!.query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values,
            }, (err, results) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                resolve(results);
            });
        });
    }

    public queryFromConnection(connection: mysql.PoolConnection, sql: string, values: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            connection.query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values,
            }, (err, results) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                resolve(results);
            });
        });
    }
}
