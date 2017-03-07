import os from 'os';
import fs from 'fs';
import co from 'co';

import _ from 'lodash';
import http from 'http';
import WebSocket  from 'ws';
import Influx from 'influx';
import bodyParser from 'body-parser';
import express from 'express';
import session from 'express-session';
import mongoDBStore from 'connect-mongodb-session';

import winston from 'winston';
import FileRotateDate from 'winston-filerotatedate';

import config from './config';

import routes from './routes';

import MongodbHelper from './mongodbHelper';
import PassportHelper from './passportHelper';

const logger = new(winston.Logger)({
  transports: [
		new (winston.transports.Console)({
			timestamp: true,
			colorize: true
		}),
		new (FileRotateDate.FileRotateDate)( {
			filename: config.log_location,
			json: false,
			maxsize: 10240000
		})
	],
});

let activeConnections = {};
let drivers = [];

const store = new (mongoDBStore(session))({
  uri: `mongodb://${config.mongoDB.address}:${config.mongoDB.port}/${config.mongoDB.database}`,
  collection: `${config.mongoDB.sessionsCollection}`
});

const dbHelper = new MongodbHelper(logger);
dbHelper.init().then(() => {
	const passportHelper = new PassportHelper(logger, dbHelper);

	// Start express
	const app = express();
	app.use(bodyParser.json());
	app.use(session({
		resave: false,
		saveUninitialized: false,
		store: store,
		secret: config.sessionSecret
	}));
	app.use(passportHelper.passport.initialize());
	app.use(passportHelper.passport.session());

	routes(logger, app, dbHelper, passportHelper);

	const server = http.createServer(app);
	const wss = new WebSocket.Server({ server });
	
	wss.on('connection', function connection(ws) {
		const sessionId = passportHelper.getSessionId(ws.upgradeReq);
		if (!sessionId) return;
		store.get(sessionId, (err, session) => {
			if (err) {
				return logger.log('error', `Failed to find session ${sessionId} on websocket request`);
			}
			let user = session.passport.user;
			logger.log('info', `Accepted socket connection for user ${user}`);

			activeConnections[user] = ws;
			bindListeners(ws, user);
		});
	});

	startOrdersWatch();
	server.listen(config.serviceRunningPort, () => {
		logger.log('info', `App listening on port ${os.hostname()}:${config.serviceRunningPort}`);
	});
}).catch((err) => {
	logger.log('error', err);
});

function bindListeners(ws, user) {
	ws.on('message', (data) => {
		try {
			let message = JSON.parse(data);
			switch (message.type) {
				case "PLACE_ORDER":
					dbHelper.placeOrder(message.trip, message.uuid, user).then(() => {
						logger.log('info', 'Order ', message.uuid, ' placed');
					});
					break;
				case "DRIVER_AVAILABLE":
					logger.log('info', 'DRIVER_AVAILABLE ', user);
					if (_.matches(drivers,{ driver: user}))
						drivers.push({driver: user, coords: message.coords});
					break;
				default:
					logger.log('info', 'Unhandled message type: ', message.type);
			}
		} catch (e) {
			logger.log('info', 'Failed to process message: ', data);
		}
	});
}

function startOrdersWatch () {
	setInterval(() => {
		while (drivers.length) {
			let driver = drivers.shift();
			dbHelper.assignOrder(driver).then((order) => {
				order = order.value;
				order.driver = driver.driver;
				logger.log('info', 'Assaigned order: ', order.uuid, 'to driver', order.driver);
				notifyDriver(order);
				notifyRider(order);
			}).catch(() => {
				driver.push(driver);
			});
		}
	}, 1000);
}


function notifyDriver(order) {
	var connection = activeConnections[order.driver];
	connection.send(JSON.stringify({
		type: 'ORDER_ASSIGNED_TO_YOU',
		order
	}))
}

function notifyRider(order) {
	var connection = activeConnections[order.rider];
	connection.send(JSON.stringify({
		type: 'DRIVER_ASSIGNED_TO_YOUR_ORDER',
		order
	}))
}