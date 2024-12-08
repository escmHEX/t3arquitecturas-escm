const { query } = require('express');
const jwt = require('jsonwebtoken');
const DB = require('./db_methods.js');
const crypto = require('crypto');

class Methods {
   constructor() {}

   generate_API_KEY() {
    // Generar un buffer de 32 bytes (256 bits)
    const buffer = crypto.randomBytes(32);
    
    // Convertir el buffer a una cadena hexadecimal
    const apiKey = buffer.toString('hex');
    
    // Devolver la API_KEY
    return apiKey;
   }

   isValidCompany_API_KEY(company_API_KEY) {
     return DB.execQuery(DB.GETQueries._companyGivenAPIKEY, [company_API_KEY]);
   }

   isValidSensor_API_KEY(sensor_API_KEY) {
    return DB.execQuery(DB.GETQueries._sensorGivenAPIKEY, [sensor_API_KEY]);
   }

   authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).send('Token no proporcionado.');

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).send('Token inválido.');
        req.user = user;
        next();
    });
   }
   
   registerAdmin(validCode, invalidCode, req, res) { 
      const p = Object.values(req.body);
      DB.execQuery(DB.insertQueries.registerAdmin, p)
      .then((r) => {
        res.status(validCode).send("Admin registrado correctamente");
      })
      .catch(err => {
          console.error("Error al registrar admin:", err);
          res.status(invalidCode).send("Error al registrar admin.");
      });
   }
   loginAdmin(validCode, invalidCode, req, res) {
    const { username, password } = req.body;
    const params = [username, password];

    DB.execQuery(DB.GETQueries.loginAdminQuery, params)
        .then((result) => {
            if (result && result.length > 0) {
                // Crear el payload del token
                const payload = { id: result[0].id, username: result[0].username };
                const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

                res.status(validCode).json({ message: "Login exitoso", token });
            } else {
                res.status(invalidCode).send("Credenciales incorrectas.");
            }
        })
        .catch(err => {
            console.error("Error al hacer login:", err);
            res.status(invalidCode).send("Error al hacer login.");
        });
   }
   createCompany(validCode, invalidCode, req, res) {
    const { company_name } = req.body;
    const company_API_KEY = this.generate_API_KEY();
    const params = [company_name, company_API_KEY];

    DB.execQuery(DB.insertQueries.createCompany, params)
    .then((result) => {
        if (result && result.length > 0) {

            res.status(validCode).json({ 
                message: `Compañia '${company_name}' creada con éxito.`,
                company_API_KEY: company_API_KEY,
                companyID: result[0].id
            });
        } 
    })
    .catch(err => {
        console.error("Error al crear la compañia:", err);
        res.status(invalidCode).send("Error al crear la compañia.");
    });

   }
   createLocation(validCode, invalidCode, req, res) {
    const { company_ID, location_name, location_country, location_city, location_meta } = req.body;
    const params = [company_ID, location_name, location_country, location_city, location_meta];

    DB.execQuery(DB.insertQueries.createLocation, params)
    .then((result) => {
        if (result && result.length > 0) {
            res.status(validCode).json({ 
                message: `Lugar '${location_name}' creado con éxito, asociado a la compañia con ID ${company_ID}`,
                locationID: result[0].id
            });
        } 
    })
    .catch(err => {
        console.error("Error al crear el lugar", err);
        res.status(invalidCode).send("Error al crear el lugar");
    });
   }
   createSensor(validCode, invalidCode, req, res) {
    const { location_ID, sensor_name, sensor_category, sensor_meta } = req.body;
    const sensor_API_KEY = this.generate_API_KEY();
    const params = [location_ID, sensor_name, sensor_category, sensor_meta, sensor_API_KEY];

    DB.execQuery(DB.insertQueries.createSensor, params)
    .then((result) => {
        if (result && result.length > 0) {
            res.status(validCode).json({ 
                message: `Sensor '${sensor_name}' de la categoria ${sensor_category} creado con éxito. Asociado al lugar con ID ${location_ID}`,
                sensor_API_KEY: sensor_API_KEY,
                sensorID: result[0].id
            });
        } 
    })
    .catch(err => {
        console.error("Error al crear el sensor", err);
        res.status(invalidCode).send("Error al crear el sensor");
    });
   }
   sendSensorData(validCode, invalidCode, req, res) {
    const { data, sensor_API_KEY } = req.body;

    this.isValidSensor_API_KEY(sensor_API_KEY).then(res2 => {
        if(res2 && res2.length > 0) {
            const createdAt = Date.now() / 1e3;
            const sensor_ID = res2[0].id;
            const sensor_name = res2[0].sensor_name;
            DB.execQuery(DB.insertQueries.sensorData, [sensor_ID, JSON.stringify(data), createdAt])
            .then(res3 => {
                if(res3 && res3.length > 0) {
                    res.status(validCode).json({ 
                        message: `Se han recibido correctamente los datos desde el sensor '${sensor_name}' con ID ${sensor_ID}`,
                        receivedData: data,
                        createdAt: createdAt
                    });
                }
            });
        } 
    });
   }
   getSensorData(validCode, invalidCode, req, res) {
    const { company_API_KEY, from, to, sensor_id } = req.query;

    this.isValidCompany_API_KEY(company_API_KEY).then(res2 => {
        if (res2 && res2.length > 0) {
            try {
                const fromInt = parseInt(from, 10);
                const toInt = parseInt(to, 10);
                const sensorIds = JSON.parse(sensor_id); // Convierte el string en un array

                if (!Array.isArray(sensorIds)) {
                    throw new Error('sensor_id debe ser un array JSON válido.');
                }

                // Crear los placeholders dinámicos para el array de sensor_ids
                const placeholders = sensorIds.map(() => '?').join(', ');

                // Ejecuta la consulta con la lista de placeholders
                const query = `
                    SELECT * 
                    FROM SensorData 
                    WHERE created_at BETWEEN ? AND ? 
                    AND sensor_id IN (${placeholders})`;

                // Concatenamos todos los parámetros, incluidos from, to y los elementos del sensorIds
                const params = [fromInt, toInt, ...sensorIds];

                DB.execQuery(query, params)
                    .then(res3 => {
                        if (res3 && res3.length > 0) {
                            // Parsear el campo 'data' que está en formato JSON string
                            res3.forEach(item => {
                                item.data = JSON.parse(item.data); // Convertir la cadena JSON en un objeto
                            });

                            res.status(validCode).json({
                                response: res3
                            });
                        } else {
                            res.status(invalidCode).send('No hay datos asociados al filtro seleccionado.');
                        }
                    });
            } catch (error) {
                res.status(invalidCode).send(`Error en el procesamiento: ${error.message}`);
            }
        } else {
            res.status(invalidCode).send('company_API_KEY inválida.');
        }
    });
   }
   getLocation(validCode, invalidCode, req, res, queryType) {
    switch(queryType) {
        case "0":
            this._getAllLocations(validCode, invalidCode, req, res);
            break;
        case "1":
            this._getSpecificLocation(validCode, invalidCode, req, res);
            break;            
     }
   }
   _getAllLocations(validCode, invalidCode, req, res) {
    const { company_API_KEY, queryType } = req.query;

    this.isValidCompany_API_KEY(company_API_KEY).then(res2 => {
        if (res2 && res2.length > 0) {
            try {
                const companyID = res2[0].id;
                DB.execQuery(DB.GETQueries._getAllLocations, [companyID])
                    .then(res3 => {
                        if (res3 && res3.length > 0) {
                            res.status(validCode).json({
                                response: res3
                            });
                        } else {
                            res.status(invalidCode).send('No hay lugares asociados a esa compañia.');
                        }
                    });
            } catch (error) {
                res.status(invalidCode).send(`Error en el procesamiento: ${error.message}`);
            }
        } else {
            res.status(invalidCode).send('company_API_KEY inválida.');
        }
    });
   }
   _getSpecificLocation(validCode, invalidCode, req, res) {
    const { company_API_KEY, queryType, location_ID } = req.query;

    this.isValidCompany_API_KEY(company_API_KEY).then(res2 => {
        if (res2 && res2.length > 0) {
            try {
                const companyID = res2[0].id;
                DB.execQuery(DB.GETQueries._getSpecificLocation, [location_ID])
                    .then(res3 => {
                        if (res3 && res3.length > 0) {
                            res.status(validCode).json({
                                response: res3
                            });
                        } else {
                            res.status(invalidCode).send(`No hay un lugar con el ID ${location_ID}`);
                        }
                    });
            } catch (error) {
                res.status(invalidCode).send(`Error en el procesamiento: ${error.message}`);
            }
        } else {
            res.status(invalidCode).send('company_API_KEY inválida.');
        }
    });
   }
   updateLocation(validCode, invalidCode, req, res) {
    const { location_ID, location_country } = req.body;
    const params = [location_country, location_ID];

    DB.execQuery(DB.updateQueries.updateLocationCountry, params)
    .then((res2) => {
        if (res2 && res2.length > 0) {
            console.log(`El lugar con id ${location_ID} ha sido actualizado.`);

            res.status(validCode).json({ 
                message: `El lugar con id ${location_ID} ha sido actualizado.`,
                change: `Nuevo location country: ${location_country}`
            });
        } else {
            console.log("No se encontraron registros para actualizar");
            res.status(invalidCode).send("No se encontraron registros para actualizar");
        }
    })
    .catch(err => {
        console.error("Error al modificar el lugar:", err);
        res.status(invalidCode).send("Error al modificar el lugar.");
    });
   }
   deleteLocation(validCode, invalidCode, req, res) {
    const { location_ID } = req.body;
    
    // Convertir explícitamente a número
    const locationId = Number(location_ID);
    const params = [locationId];

    DB.execQuery(DB.deleteQueries.deleteLocationCascade, params)
    .then((res2) => {
        if (res2 && res2.length > 0) {
            res.status(validCode).json({
                message: `El lugar con id ${locationId} ha sido eliminado.`
            });
        } else {
            res.status(invalidCode).send("No se encontraron registros para eliminar");
        }
    })
    .catch(err => {
        console.error("Error al eliminar el lugar:", err);
        res.status(invalidCode).send("Error al eliminar el lugar.");
    });
    }
   getSensor(validCode, invalidCode, req, res, queryType) {
    switch(queryType) {
        case "0":
            this._getAllSensors(validCode, invalidCode, req, res);
            break;
        case "1":
            this._getSpecificSensor(validCode, invalidCode, req, res);
            break;            
     }
   }
   _getAllSensors(validCode, invalidCode, req, res) {
    const { company_API_KEY, queryType, location_ID } = req.query;

    this.isValidCompany_API_KEY(company_API_KEY).then(res2 => {
        if (res2 && res2.length > 0) {
            try {
                DB.execQuery(DB.GETQueries._getAllSensors, [location_ID])
                    .then(res3 => {
                        if (res3 && res3.length > 0) {
                            res.status(validCode).json({
                                response: res3
                            });
                        } else {
                            res.status(invalidCode).send('No hay sensores asociados a ese lugar.');
                        }
                    });
            } catch (error) {
                res.status(invalidCode).send(`Error en el procesamiento: ${error.message}`);
            }
        } else {
            res.status(invalidCode).send('company_API_KEY inválida.');
        }
    });
   }
   _getSpecificSensor(validCode, invalidCode, req, res) {
    const { company_API_KEY, queryType, sensor_ID } = req.query;

    this.isValidCompany_API_KEY(company_API_KEY).then(res2 => {
        if (res2 && res2.length > 0) {
            try {
                DB.execQuery(DB.GETQueries._getSpecificSensor, [sensor_ID])
                    .then(res3 => {
                        if (res3 && res3.length > 0) {
                            res.status(validCode).json({
                                response: res3
                            });
                        } else {
                            res.status(invalidCode).send(`No hay un sensor con el ID ${sensor_ID}`);
                        }
                    });
            } catch (error) {
                res.status(invalidCode).send(`Error en el procesamiento: ${error.message}`);
            }
        } else {
            res.status(invalidCode).send('company_API_KEY inválida.');
        }
    });
   }
   updateSensor(validCode, invalidCode, req, res) {
    const { sensor_id, sensor_name } = req.body;
    const params = [sensor_name, sensor_id];

    DB.execQuery(DB.updateQueries.updateSensorName, params)
    .then((res2) => {
        if (res2 && res2.length > 0) {
            res.status(validCode).json({ 
                message: `El sensor con id ${sensor_id} ha sido actualizado.`,
                change: `Nuevo nombre: ${sensor_name}`
            });
        } else {
            console.log("No se encontraron registros para actualizar");
            res.status(invalidCode).send("No se encontraron registros para actualizar");
        }
    })
    .catch(err => {
        console.error("Error al modificar el sensor:", err);
        res.status(invalidCode).send("Error al modificar el sensor.");
    });
   }
   deleteSensor(validCode, invalidCode, req, res) {
    const { sensor_id } = req.body;
    
    // Convertir explícitamente a número
    const sensorID = parseInt(sensor_id);
    const params = [sensorID];

    DB.execQuery(DB.deleteQueries.deleteSensorCascade, params)
    .then((res2) => {
        if (res2 && res2.length > 0) {
            res.status(validCode).json({
                message: `El sensor con id ${sensorID} ha sido eliminado.`
            });
        } else {
            res.status(invalidCode).send("No se encontraron registros para eliminar");
        }
    })
    .catch(err => {
        console.error("Error al eliminar el sensor:", err);
        res.status(invalidCode).send("Error al eliminar el sensor.");
    });
   }
} 

module.exports = new Methods()