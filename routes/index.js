import auth from './auth';

export default (logger, app, passportHelper) => {
    auth(logger, app, passportHelper);

	app.get('/', (req, res) => {
		res.status(200).send('{}');
	});
	app.get('/api/data', passportHelper.isAuthorized, (req, res) => {
		res.status(200).send('{}');
	});
}