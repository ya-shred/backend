var express = require('express'),
    passport = require('passport'),
    GitHubStrategy = require('passport-github').Strategy,
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    MongoClient = require('mongodb').MongoClient,
    assert = require('assert'),
    MongoStore = require('connect-mongo')(session);

var GITHUB_CLIENT_ID = "ceb3d160e51558c5467e"
var GITHUB_CLIENT_SECRET = "b67e9d131aab9747c55fdeaa0776b69945c6b1de";
var mongoUrl = 'mongodb://localhost:27017/users';


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete GitHub profile is serialized
//   and deserialized.
passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});


// Use the GitHubStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and GitHub
//   profile), and invoke a callback with a user object.
passport.use(new GitHubStrategy({
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: "http://127.0.0.1:3000/auth/github/callback"
    },
    function (accessToken, refreshToken, profile, done) {
        // asynchronous verification, for effect...
        process.nextTick(function () {

            // To keep the example simple, the user's GitHub profile is returned to
            // represent the logged-in user.  In a typical application, you would want
            // to associate the GitHub account with a user record in your database,
            // and return that user instead.
            var user = {
                userName: profile.username,
                displayName: profile.displayName,
                email: profile.emails[0].value,
                profileUrl: profile.profileUrl,
                avatarUrl: profile._json.avatar_url,
                githubId: profile.id,
                accessToken: accessToken
            }
            return done(null, user);

        });
    }
));




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
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({
        url: mongoUrl
    })
}));



//app.use(function(req, res, next){
//    req.session.numberOfVisits = req.session.numberOfVisits + 1 || 1;
//    res.send("Visits" + req.session.numberOfVisits)
//});
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.get('/', function (req, res) {
    res.render('index', {
        user: req.user
    });

});



app.get('/login', function (req, res) {
    res.render('login', {
        user: req.user
    });
});

// GET /auth/github
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in GitHub authentication will involve redirecting
//   the user to github.com.  After authorization, GitHubwill redirect the user
//   back to this application at /auth/github/callback
app.get('/auth/github',
    passport.authenticate('github'),
    function (req, res) {
        // The request will be redirected to GitHub for authentication, so this
        // function will not be called.
    });

// GET /auth/github/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/github/callback',
    passport.authenticate('github', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        res.redirect('/');


        var insertUser = function (db, callback) {
            // Get the documents collection
            var collection = db.collection('user');
            // Insert some documents
            collection.ensureIndex({
                gitId: 1
            }, {
                unique: true
            });
            collection.insert({
                userName: req.user.userName,
                displayName: req.user.displayName,
                email: req.user.email,
                profileUrl: req.user.profileUrl,
                avatarUrl: req.user.avatarUrl,
                githubId: req.user.githubId,
                accessToken: req.user.accessToken
            });

        }

        MongoClient.connect(mongoUrl, function (err, db) {
            assert.equal(null, err);
            console.log("Connected correctly to server");
            insertUser(db, function () {
                db.close();
            });
        });
    });



app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});
app.use(express.static(__dirname + '/public'));





var server = app.listen(3000, function () {

    var host = server.address().address
    var port = server.address().port

    console.log('Example app listening at http://%s:%s', host, port)

})



// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login')
}