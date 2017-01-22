export default (logger, app, dbHelper, passportHelper) => {
	app.post('/signup', passportHelper.passport.authenticate('local-signup'), (req, res) => {
		res.status(200).send('{"status": "success"}');
	});
	app.post('/login', passportHelper.passport.authenticate('local-login'), (req, res) => {
		res.status(200).send('{"status": "success"}');
	});
	app.post('/logout', (req, res) => {
		req.logout();
		res.status(200).send('{"status": "success"}');
	});
}