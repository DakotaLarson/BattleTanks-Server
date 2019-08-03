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

    public queryFromConnection(connection: mysql.PoolConnection, sql: string, values?: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            connection.query({
                sql,
                timeout: DatabaseHandler.TIMEOUT,
                values,
            }, (err, results) => {
                if (err) {
                    reject(err);
                }
                resolve(results);
            });
        });
    }

    public startTransaction(): Promise<mysql.PoolConnection> {
        return new Promise((resolve, reject) => {
            this.pool!.getConnection((connectionErr: mysql.MysqlError, connection: mysql.PoolConnection) => {
                if (connectionErr) {
                    reject(connectionErr);
                }

                connection.beginTransaction((transactionErr: mysql.MysqlError) => {
                    if (transactionErr) {
                        reject(connectionErr);
                    }
                    resolve(connection);
                });
            });
        });
    }

    public commit(connection: mysql.PoolConnection) {
        return new Promise((resolve, reject) => {
            connection.commit((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    public rollback(connection: mysql.PoolConnection) {
        return new Promise((resolve, reject) => {
            connection.rollback((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
