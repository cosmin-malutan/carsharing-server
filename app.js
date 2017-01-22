import os from 'os';
import fs from 'fs';
import co from 'co';

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

	server.listen(config.serviceRunningPort, () => {
		logger.log('info', `App listening on port ${os.hostname()}:${config.serviceRunningPort}`);
	});
}).catch((err) => {
	logger.log('error', err);
});

function bindListeners(ws, user) {
	ws.on('message', (data) => { logger.log('info', data)});
}
