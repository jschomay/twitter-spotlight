var privateConfig = require('./private-config'),
    OAuth         = require('oauth').OAuth,
    util          = require('util'),
    express       = require('express'),
    async         = require('async'),
    spotlight     = require('./lib/spotlight'),
    app           = express(),
    nodemailer    = require("nodemailer");
    // pipe console log to browser
    require('node-monkey').start();
    // require('longjohn');
// live reload, just saving styl files, etc will immidiately reflect changes in browser
// require('express-livereload')(app, config={});



var oa = new OAuth(
  "https://api.twitter.com/oauth/request_token",
  "https://api.twitter.com/oauth/access_token",
  privateConfig.consumerKey,
  privateConfig.consumerSecret,
  "1.0",
  null, //this parm is needed, but we'll plug it in below to make it dynamic
  "HMAC-SHA1"
);



app.configure(function(){
  app.use(express.favicon(__dirname + '/public/favicon.ico'));
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({ secret: privateConfig.sessionSecret }));
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});


app.get('/', authBounce, function(req, res){
  var user = {screenName: req.session.screen_name};
  // get the user timeline and recent activity in parallel to process
  // hmmm, wish I didn't have to hit 5+ api's, but I'm not sure if there's a better way to do it...
  console.time('api calls');
  async.parallel({
    timeline: function(callback){
      callTwitterApi('statuses/home_timeline.json', '?count=50', req, function(error, data) {
        // util.puts('data from callTwitterApi', util.inspect(JSON.parse(data))); // view in terminal console
        console.log('Timeline', JSON.parse(data)); // inspect in browser (via node-monkey)
        callback(error, JSON.parse(data));
      });
    },
    userTweets: function(callback){
      callTwitterApi('statuses/user_timeline.json', '?count=100', req, function(error, data){
        console.log('User Tweets', JSON.parse(data)); // inspect in browser (via node-monkey)
        callback(error, JSON.parse(data));
      });
    },
    mentions: function(callback){
      callTwitterApi('statuses/mentions_timeline.json', '?count=200', req, function(error, data){
        console.log('Mentions', JSON.parse(data)); // inspect in browser (via node-monkey)
        callback(error, JSON.parse(data));
      });
    },
    favorites: function(callback){
      callTwitterApi('favorites/list.json', '?count=100', req, function(error, data){
        console.log('favorites', JSON.parse(data)); // inspect in browser (via node-monkey)
        callback(error, JSON.parse(data));
      });
    },
    followers: function(callback){
      callTwitterApi('followers/list.json', '?skip_status=true&include_user_entities=false&count=50', req, function(error, data){
        console.log('followers', JSON.parse(data)); // inspect in browser (via node-monkey)
        callback(error, JSON.parse(data));
      });
    },
    friends: function(callback){
      callTwitterApi('friends/list.json', '?skip_status=true&include_user_entities=false&count=100', req, function(error, data){
        console.log('friends', JSON.parse(data)); // inspect in browser (via node-monkey)
        callback(error, JSON.parse(data));
      });
    }
  },
  // filter timeline through smartlist
  function(err, results) {
    console.timeEnd('api calls');
    if (err) {
      util.error('Error calling twitter api', util.inspect(err));
      res.send('Got an error when trying to talk to twitter :('+ JSON.stringify(err));
    } else {
      // TODO refactor makeSmartList to parseFeed() and iterate over with results
      spotlight.setConfig(req.cookies.ttsconfig);
      spotlight.makeSmartList(results.userTweets, results.mentions, results.favorites, results.followers, results.friends);
      var filteredTimeline = spotlight.filterTimeline(results.timeline, user, req.cookies);
      var locals = {
        user: user,
        tweets: filteredTimeline,
        config: spotlight.getConfig(),
        smartlist: spotlight.getSmartList().join(', ')
      };

      res.render('index', locals);
    }
  });
});

app.get('/login', function(req, res){
  if (isLoggedIn(req)){
    res.redirect('/');
  }
  else {
    res.send('Welcome to Twitter Timeline Spotlight.  Please <a href="/auth/twitter">Sign in with Twitter</a> to use.');
  }
});

app.get('/auth/twitter', function(req, res){
  // plug requested host in here to keep it dynamic (dev vs prod, and testing on other devices)
  oa._authorize_callback = "http://"+req.host+":3000/auth/twitter/callback",
  oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
    if (error) {
      util.puts(error);
      res.send("yeah no. didn't work.");
    }
    else {
      req.session.oauth = {};
      req.session.oauth.token = oauth_token;
      util.puts('oauth.token: ' + req.session.oauth.token);
      req.session.oauth.token_secret = oauth_token_secret;
      util.puts('oauth.token_secret: ' + req.session.oauth.token_secret);
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
        util.puts(util.inspect(error));
        res.send("yeah something broke. try going <a href=\"/\">here</a>");
      } else {
        req.session.oauth.access_token = oauth_access_token;
        req.session.oauth.access_token_secret = oauth_access_token_secret;
        req.session.screen_name = results.screen_name;
        console.log(results);
        res.redirect('/');
      }
    }
    );
  } else
    next(new Error("you're not supposed to be here."));
});

app.post('/feedback', function(req, res){
  // create reusable transport method (opens pool of SMTP connections)
  var smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
      user: "jschomay@gmail.com",
      pass: new Buffer(privateConfig.smpt, 'base64').toString('ascii')
    }
  });

  // setup e-mail data with unicode symbols
  var mailOptions = {
    from: 'Twitter Timeline Spotlight <noreply@twittertimelinespotlight.com>',
    to: 'jschomay@gmail.com',
    subject: 'Twitter Timeline Spotlight feedback',
    html: htmlEntities(req.body.feedback),
  };
  function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // send mail with defined transport object
  smtpTransport.sendMail(mailOptions, function(error, response){
    if(error){
      console.log(error);
      res.send(500);
    }else{
      console.log("Message sent: " + response.message);
      res.send(200);
    }

    smtpTransport.close(); // shut down the connection pool, no more messages
  });
});

function authBounce(req, res, next){
  // console.log(req.session);
  if(isLoggedIn(req)){
    console.log("Logged in as", req.session.screen_name);
    next();
   }
  else {
    console.log("No access token found, go to log in");
    // res.redirect('/login'); // uncoment and remove next line to show sign in page
    res.redirect('/auth/twitter');
  }
}

function isLoggedIn(req) {
  return (req.session.oauth && req.session.oauth.access_token);
}

// consider using instead: https://github.com/danielhusar/node-twitter/blob/master/lib/twitter.js
function callTwitterApi(resourceUrl, paramsString, req, cb) {
  var url = "https://api.twitter.com/1.1/"+resourceUrl+(paramsString ? paramsString : '');
  oa.get(url, req.session.oauth.access_token, req.session.oauth.access_token_secret, function(error, data) {
    if (error) {
      error.requestedUrl = url;
    }
    cb(error, data);
  });
}


app.listen(3000);
util.puts('Listening on port 3000');