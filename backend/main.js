require('dotenv').config({ path: './config.env' });
const express = require('express');
const app = express();
const Methods = require('./methods');

/*
Definición de rutas

Convención Methods.type:
  0 -> GET
  1 -> POST
  2 -> PUT
  3 -> DELETE
  4 -> USE (middleware)
*/
const baseURL = `/api/v1/`;
const API_data = {
    registerAdmin: {
        route: `${baseURL}registerAdmin`,
        validReturnValue: 200,
        methods: [
            {
                func: Methods.registerAdmin.bind(Methods),
                type: 1
            }
        ]
    },
    loginAdmin: {
        route: `${baseURL}loginAdmin`,
        validReturnValue: 200,
        methods: [
            {
                func: Methods.loginAdmin.bind(Methods),
                type: 1
            }
        ]
    },
    createCompany: {
        route: `${baseURL}createCompany`,
        validReturnValue: 200,
        requireAdminAuth: true,
        methods: [
            {
                func: Methods.createCompany.bind(Methods),
                type: 1
            }
        ]
    },
    createLocation: {
        route: `${baseURL}createLocation`,
        validReturnValue: 200,
        requireAdminAuth: true,
        methods: [
            {
                func: Methods.createLocation.bind(Methods),
                type: 1
            }
        ]
    },
    createSensor: {
        route: `${baseURL}createSensor`,
        validReturnValue: 200,
        requireAdminAuth: true,
        methods: [
            {
                func: Methods.createSensor.bind(Methods),
                type: 1
            }
        ]
    },
    sensorData: {
        route: `${baseURL}sensor_data`,
        validReturnValue: 201,
        invalidReturnValue: 400,
        methods: [
            {
                func: Methods.getSensorData.bind(Methods),
                type: 0
            },
            {
                func: Methods.sendSensorData.bind(Methods),
                type: 1
            }
        ]
    },
    getLocation: {
        route: `${baseURL}getLocation`,
        validReturnValue: 200,
        multipleQueries: true,
        methods: [
            {
                func: Methods.getLocation.bind(Methods),
                type: 0
            }
        ]
    },
    updateLocation: {
        route: `${baseURL}updateLocation`,
        validReturnValue: 200,
        requireAdminAuth: true,
        methods: [
            {
                func: Methods.updateLocation.bind(Methods),
                type: 2
            }
        ]
    }, 
    deleteLocation: {
        route: `${baseURL}deleteLocation`,
        validReturnValue: 200,
        requireAdminAuth: true,
        methods: [
            {
                func: Methods.deleteLocation.bind(Methods),
                type: 3
            }
        ]
    },
    getSensor: {
        route: `${baseURL}getSensor`,
        validReturnValue: 200,
        multipleQueries: true,
        methods: [
            {
                func: Methods.getSensor.bind(Methods),
                type: 0
            }
        ]
    },
    updateSensor: {
        route: `${baseURL}updateSensor`,
        validReturnValue: 200,
        requireAdminAuth: true,
        methods: [
            {
                func: Methods.updateSensor.bind(Methods),
                type: 2
            }
        ]
    }, 
    deleteSensor: {
        route: `${baseURL}deleteSensor`,
        validReturnValue: 200,
        requireAdminAuth: true,
        methods: [
            {
                func: Methods.deleteSensor.bind(Methods),
                type: 3
            }
        ]
    }
};

function createRoutes(data) {
  for(const endPointData of Object.values(data)) {
    const validCode = endPointData.validReturnValue ?? 200;
    const invalidCode = endPointData.invalidReturnValue ?? 404;

    for(const method of endPointData.methods) {
        switch(method.type) {
            case 0:
                   app.get(endPointData.route, (req, res) => {
                     if(endPointData?.multipleQueries) { // Debe pasar el queryType
                        method.func(validCode, invalidCode, req, res, req.query.queryType);
                     } else {
                        method.func(validCode, invalidCode, req, res);
                     }
                   });
                   break;
            case 1:
                   if(endPointData?.requireAdminAuth) {
                    app.post(endPointData.route, express.json(), Methods.authenticateToken, (req, res) => {
                        method.func(validCode, invalidCode, req, res);
                      });
                   } else {
                    app.post(endPointData.route, express.json(), (req, res) => {
                        method.func(validCode, invalidCode, req, res);
                      });
                   }
                   break;
            case 2:
                if(endPointData?.requireAdminAuth) {
                    app.put(endPointData.route, express.json(), Methods.authenticateToken, (req, res) => {
                        method.func(validCode, invalidCode, req, res);
                      });
                   } else {
                    app.put(endPointData.route, express.json(), (req, res) => {
                        method.func(validCode, invalidCode, req, res);
                      });
                   }
                   break;                
            case 3:
                if(endPointData?.requireAdminAuth) {
                    app.delete(endPointData.route, express.json(), Methods.authenticateToken, (req, res) => {
                        method.func(validCode, invalidCode, req, res);
                      });
                   } else {
                    app.delete(endPointData.route, express.json(), (req, res) => {
                        method.func(validCode, invalidCode, req, res);
                      });
                   }
                   break;                
        }
    }
  } 
}

function createSpecialRoutes() {
  // 404 
  app.use((req, res) => {
    res.status(404).send('[404] Recurso inexistente');
});
}

createRoutes(API_data);
createSpecialRoutes();

app.listen(process.env.WEBSERVER_PORT, () => {
    console.log(`Servidor corriendo en el puerto ${process.env.WEBSERVER_PORT}`);
});



