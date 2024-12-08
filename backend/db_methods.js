require('dotenv').config({ path: './config.env' });
const duckdb = require('duckdb');
const db = new duckdb.Database(process.env.DATABASE_FILE); 

class DB {
    constructor(db) {
      this.db = db;
      this.conn = null;
      this.insertQueries = {
        registerAdmin: `INSERT INTO Admin (username, password) VALUES (?, ?)`,
        createCompany: `INSERT INTO Company (company_name, company_API_KEY) VALUES (?, ?) RETURNING id`,
        createLocation: `INSERT INTO Location (company_id, location_name,
        location_country, location_city, location_meta) VALUES (?, ?, ?, ?, ?) RETURNING id`,
        createSensor: `INSERT INTO Sensor (location_id, sensor_name,
        sensor_category, sensor_meta, sensor_API_KEY) VALUES (?, ?, ?, ?, ?) RETURNING id`,
        sensorData: `INSERT INTO SensorData (sensor_id, data, created_at) VALUES (?, ?, ?)`
      };

      this.GETQueries = {
        loginAdminQuery: `SELECT * FROM Admin WHERE username = ? AND password = ?`,
        _getAllLocations: `SELECT * FROM Location WHERE company_id = ?`,
        _getSpecificLocation: `SELECT * FROM Location WHERE id = ?`,
        _getAllSensors: `SELECT * FROM Sensor WHERE location_id = ?`,
        _getSpecificSensor: `SELECT * FROM Sensor WHERE id = ?`,
        _sensorGivenAPIKEY: `SELECT * FROM Sensor WHERE sensor_API_KEY = ?`,
        _companyGivenAPIKEY: `SELECT * FROM Company WHERE company_API_KEY = ?`
      };

      this.updateQueries = {
        updateLocationCountry: `
            UPDATE Location
            SET location_country = ?
            WHERE id = ?`,

        updateSensorName: `
            UPDATE Sensor
            SET sensor_name = ?
            WHERE id = ?`
    };

    this.deleteQueries = {
        deleteLocationCascade: `
            DELETE FROM Location
            WHERE id = ?;`,

        deleteSensorCascade: `
            DELETE FROM Sensor
            WHERE id = ?;`
    };
    
    }

    conn() { 
        this.conn = this.db.connect(); 
    }
    releaseConn() { 
      if(this.conn) this.conn.close(), this.conn = null;
    }
    execQuery(query, params = []) {
        if (!this.conn) this.conn = this.db.connect();
    
        try {
            return new Promise((resolve, reject) => {
                if (params.length > 0) {
                    const stmt = this.conn.prepare(query);
                    stmt.all(...params, (err, rows) => {
                        stmt.finalize();
                        if (err) reject(err);
                        else resolve(rows); // Devuelve las filas
                    });
                } else {
                    this.conn.all(query, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows); // Devuelve las filas
                    });
                }
            });
        } catch (err) {
            console.log(err);
        }
    }
    
    
};

module.exports = new DB(db);