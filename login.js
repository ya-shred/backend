var express = require('express'),
    passport = require('passport'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    MongoClient = require('mongodb').MongoClient,
    MongoStore = require('connect-mongo')(session),
    assert = require('assert');

var config = require('./config.json');

var user = require('./user');

var GitHubStrategy = require('passport-github').Strategy;

var mongoUrl = 'mongodb://localhost:27017/main';
var api = user(mongoUrl);



var app = express();

// configure Express

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(cookieParser());

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.use(methodOverride());
app.use(session({
    secret: 'hello ret',
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({
        url: mongoUrl
    })
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(api.serializeUser);
passport.deserializeUser(api.deserializeUser);

passport.use(new GitHubStrategy({
        clientID: config.githubApp.id,
        clientSecret: config.githubApp.secret,
        callbackURL: "http://localhost:3000/auth/github/callback"
    },
    function (accessToken, refreshToken, profile, callback) {
         api.findOrCreateUser(profile, callback);
    }
));

app.get('/', function (req, res) {
    res.render(req.user ? 'account' : 'login', {
        user: req.user
    });

    console.log("Navigated to /");
});

app.get('/login', function (req, res) {
    res.render('login', {
        user: req.user
    });
    console.log("Navigated to /login");
});

app.get('/auth/github',
    passport.authenticate('github'),
    function (req, res) {
        // The request will be redirected to GitHub for authentication, so this
        // function will not be called.
    });

app.get('/auth/github/callback', passport.authenticate('github', {
    successRedirect: '/',
    failureRedirect: '/login'
}));

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});
app.use(express.static(__dirname + '/public'));

var server = app.listen(3000, function () {
    var host = server.address().address
    var port = server.address().port
    console.log('Example app listening at http://%s:%s', host, port)

});