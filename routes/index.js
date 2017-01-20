import auth from './auth';

export default function(logger, app, dbHelper, passportHelper) {
    auth(logger, app, dbHelper, passportHelper);

	app.get('/', function(req, res) {
		res.status(200).send('{}');
	});
	app.get('/api/data', passportHelper.isAuthorized, function(req, res) {
		res.status(200).send('{}');
	});
}