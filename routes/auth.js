export default (logger, app, dbHelper, passportHelper) => {
	app.post('/signup', passportHelper.passport.authenticate('local-signup'), (req, res) => {
		res.status(200).send('{"status": "success"}');
		logger.log('info', 'User ', (req.user && req.user.username), ' signed in');
	});
	app.post('/login', passportHelper.passport.authenticate('local-login'), (req, res) => {
		res.status(200).send('{"status": "success"}');
		logger.log('info', 'User ', (req.user && req.user.username), ' logged in');
	});
	app.post('/logout', (req, res) => {
		let user = (req.user && req.user.username);
		req.logout();
		res.status(200).send('{"status": "success"}');
		logger.log('info', 'User ', user, ' logged out');
	});
}