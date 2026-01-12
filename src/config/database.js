/**
 * Konfiguracja bazy danych - Singleton Pattern
 * Panel Zleceń Graficznych
 */

const mysql = require('mysql2/promise');

class Database {
    static instance = null;
    pool = null;

    constructor() {
        this.pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'panel_zlecen',
            port: process.env.DB_PORT || 3306,
            charset: 'utf8mb4',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    getPool() {
        return this.pool;
    }

    async query(sql, params = []) {
        const [rows] = await this.pool.execute(sql, params);
        return rows;
    }

    async fetch(sql, params = []) {
        const rows = await this.query(sql, params);
        return rows[0] || null;
    }

    async fetchAll(sql, params = []) {
        return await this.query(sql, params);
    }

    async insert(table, data) {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const values = Object.values(data);

        const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
        const [result] = await this.pool.execute(sql, values);

        return result.insertId;
    }

    async update(table, data, where, whereParams = []) {
        const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(data), ...whereParams];

        const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
        const [result] = await this.pool.execute(sql, values);

        return result.affectedRows;
    }

    async delete(table, where, params = []) {
        const sql = `DELETE FROM ${table} WHERE ${where}`;
        const [result] = await this.pool.execute(sql, params);

        return result.affectedRows;
    }

    async beginTransaction() {
        const connection = await this.pool.getConnection();
        await connection.beginTransaction();
        return connection;
    }

    async commit(connection) {
        await connection.commit();
        connection.release();
    }

    async rollback(connection) {
        await connection.rollback();
        connection.release();
    }
}

module.exports = Database;
