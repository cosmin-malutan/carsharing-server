import os from 'os';
import fs from 'fs';
import co from 'co';

import Influx from 'influx';
import bodyParser from 'body-parser';
import express from 'express';
import session from 'express-session';

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

const dbHelper = new MongodbHelper(logger);
dbHelper.init().then(() => {
	const passportHelper = new PassportHelper(logger, dbHelper);

	// Start express
	const app = express();
	app.use(bodyParser.json());
	app.use(session({
		resave: false,
		saveUninitialized: false,
		secret: 'keyboard'
	}));
	app.use(passportHelper.passport.initialize());
	app.use(passportHelper.passport.session());

	routes(logger, app, dbHelper, passportHelper);

	app.listen(config.serviceRunningPort, () => {
		logger.log('info', `App listening on port ${os.hostname()}:${config.serviceRunningPort}`);
	});
}).catch((err) => {
	logger.log('error', err);
});
