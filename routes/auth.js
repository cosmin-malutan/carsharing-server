export default function auth(logger, app, dbHelper, passportHelper) {
  app.post('/signup', passportHelper.passport.authenticate('local-signup'), function(req, res) {
		res.status(200).send('{"status": "success"}');
	});
	app.post('/login', passportHelper.passport.authenticate('local-login'), function(req, res) {
		res.status(200).send('{"status": "success"}');
	});
	app.post('/logout', function(req, res) {
		req.logout();
		res.status(200).send('{"status": "success"}');
	});
}