var express = require('express'),
    passport = require('passport'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    MongoClient = require('mongodb').MongoClient,
    MongoStore = require('connect-mongo')(session),
    assert = require('assert');

var config = require('config');

var user = require('./user');

var GitHubStrategy = require('passport-github').Strategy;

var mongoUrl = config.get('dbConnectionUrl');
var api = user(mongoUrl);


var app = express();

// configure Express

var sessionCookie = 'connect.sid';

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(cookieParser());

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.use(methodOverride());
app.use(session({
    secret: 'shred 15',
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({
        url: mongoUrl
    }),
    name: sessionCookie
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(api.serializeUser);
passport.deserializeUser(api.deserializeUser);

passport.use(new GitHubStrategy({
        clientID: config.get('githubAppId'),
        clientSecret: config.get('githubAppSecret'),
        callbackURL: config.get('githubAppCallback')
    },
    function (accessToken, refreshToken, profile, callback) {
        api.findOrCreateUser(profile, callback);
    }
));

//app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    if (req.user) {
        return api.getUser(req.user.id, redirectToChat.bind(null, req, res));
    }
    res.render('login');

    console.log("Navigated to /");
});

app.get('/auth/github',
    passport.authenticate('github'),
    function (req, res) {
        // The request will be redirected to GitHub for authentication, so this
        // function will not be called.
    });

app.get('/auth/github/callback', passport.authenticate('github', {
    successRedirect: '/',
    failureRedirect: '/'
}));

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

var server = app.listen(config.get('port'), function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Example app listening at http://%s:%s', host, port);
});

var redirectToChat = function (req, res, err, user) {
    console.log('redirect', user);
    res.statusCode = 302;
    res.setHeader("Location", config.get('redirectUrl') + '?' + req.sessionID);
    res.end();
};