
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var Promise = require('promise');

function PassportHelper (logger, dbHelper) {
    this.logger = logger;
    this.dbHelper = dbHelper;
    this.passport = passport;

    this.localStrategy = new LocalStrategy({
		usernameField: 'username',
		passwordField: 'password',
		passReqToCallback: true
	}, function(req, username, password, done) {
		dbHelper.findUser(username).then(function (user) {
			done(null, user);
		}).catch(function (err) {
			done(err, null);
		});
	});

	passport.serializeUser(this.serializeUser());
	passport.deserializeUser(this.deserializeUser());
	passport.use('local-login', new LocalStrategy({
		usernameField: 'email',
		passwordField: 'password',
		passReqToCallback: true
	}, function(req, email, password, done) {
		dbHelper.findUser(email).then(function (user) {
			done(null, user);
		}).catch(function (err) {
			done(err, null);
		});
	}));
    
	passport.use('local-signup', new LocalStrategy({
		usernameField: 'email',
		passwordField: 'password',
		passReqToCallback: true
	}, function(req, email, password, done) {
        var username = req.body.username;
        Promise.all([dbHelper.assureUniqueEmail(email), dbHelper.assureUniqueUsername(username)]).then(function ([uniqueE, uniqueU]) {
            var user = {
                email: email,
                username: username,
                password: password
            };

            dbHelper.createUser(user).then(function (response) {
                if (response && response.result && response.result.ok) {
			        done(null, user);
                } else {
                    done(new Error('Failed to create user.'), null);
                }
            })
        }).catch(function (err) {
            done(err, null);
        })
	}));
}

PassportHelper.prototype.serializeUser = function () {
    var self = this;

    return (user, callback) => {
        callback(null, user.email);
    }
};

PassportHelper.prototype.deserializeUser = function () {
    var self = this;

    return (email, done) => {
        self.dbHelper.findUser(email).then(function (user) {
            done(null, user);
        }).catch(function (err) {
            done(err, null);
        });
    }
};

PassportHelper.prototype.isAuthorized = function (req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.status(401).end('{"error": "UNAUTHORIZED"}');
    }
};

module.exports = PassportHelper;