var privateConfig = require('./private-config'),
    OAuth         = require('oauth').OAuth,
    express       = require('express'),
    app           = express();

var oa = new OAuth(
  "https://api.twitter.com/oauth/request_token",
  "https://api.twitter.com/oauth/access_token",
  privateConfig.consumerKey,
  privateConfig.consumerSecret,
  "1.0",
  "http://127.0.0.1:3000/auth/twitter/callback",
  "HMAC-SHA1"
);



app.configure(function(){
  // app.set('views', __dirname + '/views');
  // app.set('view engine', 'jade');
  // app.set('view options', {layout: false});
  // app.use(express.favicon());
  app.use(express.logger('dev'));
  // app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({ secret: privateConfig.sessionSecret }));
  app.use(app.router);
  // app.use(require('stylus').middleware(__dirname + '/public'));
  // app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', function(req, res){
  res.redirect('/auth/twitter');
});

app.get('/auth/twitter', function(req, res){
  oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
    if (error) {
      console.log(error);
      res.send("yeah no. didn't work.");
    }
    else {
      req.session.oauth = {};
      req.session.oauth.token = oauth_token;
      console.log('oauth.token: ' + req.session.oauth.token);
      req.session.oauth.token_secret = oauth_token_secret;
      console.log('oauth.token_secret: ' + req.session.oauth.token_secret);
      res.redirect('https://twitter.com/oauth/authenticate?oauth_token='+oauth_token);
  }
  });
});

app.get('/auth/twitter/callback', function(req, res, next){
  if (req.session.oauth) {
    req.session.oauth.verifier = req.query.oauth_verifier;
    var oauth = req.session.oauth;

    oa.getOAuthAccessToken(oauth.token,oauth.token_secret,oauth.verifier,
    function(error, oauth_access_token, oauth_access_token_secret, results){
      if (error){
        console.log(error);
        res.send("yeah something broke.");
      } else {
        req.session.oauth.access_token = oauth_access_token;
        req.session.oauth.access_token_secret = oauth_access_token_secret;
        console.log(results);
        res.send("Hello @"+results.screen_name);
      }
    }
    );
  } else
    next(new Error("you're not supposed to be here."));
});
app.listen(3000);
console.log('Listening on port 3000');