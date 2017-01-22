import auth from './auth';

export default (logger, app, dbHelper, passportHelper) => {
    auth(logger, app, dbHelper, passportHelper);

	app.get('/', (req, res) => {
		res.status(200).send('{}');
	});
	app.get('/api/data', passportHelper.isAuthorized, (req, res) => {
		res.status(200).send('{}');
	});
}