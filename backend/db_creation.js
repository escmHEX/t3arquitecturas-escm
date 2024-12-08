const DB = require('./db_methods');

// Creación de secuencias para IDs
const sequenceQueries = [
    `CREATE SEQUENCE IF NOT EXISTS seq_adminid START 1`,
    `CREATE SEQUENCE IF NOT EXISTS seq_companyid START 1`,
    `CREATE SEQUENCE IF NOT EXISTS seq_locationid START 1`,
    `CREATE SEQUENCE IF NOT EXISTS seq_sensorid START 1`,
    `CREATE SEQUENCE IF NOT EXISTS seq_sensordataid START 1`
];

// Ejecución de las secuencias
sequenceQueries.forEach(query => {
    DB.execQuery(query);
});

// Creación de tablas con IDs generados por secuencia
const tableQueries = [
    // Tabla Admin
    `CREATE TABLE IF NOT EXISTS Admin (
        id INTEGER DEFAULT NEXTVAL('seq_adminid') PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL
    )`,

    // Tabla Company
    `CREATE TABLE IF NOT EXISTS Company (
        id INTEGER DEFAULT NEXTVAL('seq_companyid') PRIMARY KEY,
        company_name TEXT NOT NULL,
        company_API_KEY TEXT NOT NULL
    )`,

    // Tabla Location
    `CREATE TABLE IF NOT EXISTS Location (
        id INTEGER DEFAULT NEXTVAL('seq_locationid') PRIMARY KEY,
        company_id INTEGER NOT NULL,
        location_name TEXT NOT NULL,
        location_country TEXT NOT NULL,
        location_city TEXT NOT NULL,
        location_meta TEXT,
        FOREIGN KEY (company_id) REFERENCES Company(id)
    )`,

    // Tabla Sensor
    `CREATE TABLE IF NOT EXISTS Sensor (
        id INTEGER DEFAULT NEXTVAL('seq_sensorid') PRIMARY KEY,
        location_id INTEGER NOT NULL,
        sensor_name TEXT NOT NULL,
        sensor_category TEXT NOT NULL,
        sensor_meta TEXT,
        sensor_API_KEY TEXT NOT NULL,
        FOREIGN KEY (location_id) REFERENCES Location(id)
    )`,

    // Tabla SensorData
    `CREATE TABLE IF NOT EXISTS SensorData (
        id INTEGER DEFAULT NEXTVAL('seq_sensordataid') PRIMARY KEY,
        sensor_id INTEGER NOT NULL,
        data JSON NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (sensor_id) REFERENCES Sensor(id)
    )`
];

// Ejecución de las tablas
tableQueries.forEach(query => {
    DB.execQuery(query);
    DB.releaseConn();
});
