var os = require('os');
var fs = require('fs');
var co = require('co');

var Influx = require('influx');
var bodyParser = require('body-parser');
var express = require('express');
var session = require('express-session');

var winston = require('winston');
var FileRotateDate = require('winston-filerotatedate');

var config = require('./config');

var routes = require('./routes');

var MongodbHelper = require('./mongodbHelper');
var PassportHelper = require('./passportHelper');


var logger = new(winston.Logger)({
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

var dbHelper = new MongodbHelper(logger);
dbHelper.init().then(function () {
	var passportHelper = new PassportHelper(logger, dbHelper);

	// Start express
	var app = express();
	app.use(bodyParser.json());
	app.use(session({
		resave: false,
		saveUninitialized: false,
		secret: 'keyboard'
	}));
	app.use(passportHelper.passport.initialize());
	app.use(passportHelper.passport.session());

	routes(logger, app, dbHelper, passportHelper);

	app.listen(config.serviceRunningPort, function () {
		logger.log('info', `App listening on port ${os.hostname()}:${config.serviceRunningPort}`);
	});
}).catch(function(err) {
	logger.log('error', err);
});
