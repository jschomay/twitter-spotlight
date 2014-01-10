var DEBUG = true;

var _ = require('underscore');

var smartList = [];
var smartListReasonsByTerm = {};

var config = {};
var configDefaults = {
      firstFew: 0, // how many tweets to always show expanded at top of feed
      enforceHashtagMatches: false, // spotlight tweets with words/screennames matching user's tweeted hashtags, or only spotlight if they use the hashtag
      recency: {
        hashtags: 10, // in days
        usersYouInteractWith: 15,
        usersInteractingWithYou: 10,
        followers: 5, // who you have followed back
        followed: 3

      },
};


module.exports = spotlight = {
  setConfig: function (configString) {
    config = JSON.parse(JSON.stringify(configDefaults));
    smartList = [];
    smartListReasonsByTerm = {};
    if (configString) {
      var userConfig = {};
      _.each(configString.split('&'),function(i){
        userConfig[i.split('=')[0]] = i.split('=')[1];
      });
      console.log("Using user set config values: ",userConfig);
      _.extend(config.recency, userConfig);
    }
  },
  getConfig: function (){ return config;},
  /*
  Array of terms pulled from user's tweets and actions
  */
  getSmartList: function (){ return smartList;},

  /*
  Adds terms to smartList from passed in data from twitter

  Smartlist conditions (may be slightly different):
    * Top 3 tweets on your timeline always expanded (to see what is freshest, unfiltered)
    * New people you followed in past 5 days ("recency periods" are configurable) (api doesnt give dates for friendships)
    * All people you have interactions with in last 15 days:
      * Users you: retweeted, replied to, mentioned, favorited a tweet of
      * Users who: followed, retweeted, replied to, mentioned, favorited you (the api doesn't tell who favorited tweets currently)
    * Tweets with hashtags you have used in the last 10 days
    * Manual "always spotlight this user" (maybe, need to persist it somewhere)
  */
  makeSmartList: function (userTweets, mentions, favorites, followers, friends) {

    // terms to add to smart list
    var hashtags = [], users = [];
    var interactionsGraph = {};


    function withinXDays(date, daysAgo) {
      return (new Date() - new Date(date))/(1000*60*60*24) < daysAgo;
    }

    function hashtagify (term) {
      return (config.enforceHashtagMatches ? '#' : '') + term;
    }

    function inspectFeed(feed, parseFn) {
      _.each(feed, function(tweet) {
        parseFn(tweet);
      });
    }

    function populateTermReason(term, action, reason) {
      term = term.toLowerCase();
      if (!interactionsGraph[action])
        interactionsGraph[action] = [];
      if (interactionsGraph[action].indexOf(term) < 0) {
        interactionsGraph[action].push(term);
        if (!smartListReasonsByTerm[term])
          smartListReasonsByTerm[term] = [];
        smartListReasonsByTerm[term].push(reason);
      }
    }

    // pull out smartlist data from our feeds
    inspectFeed(userTweets, function(tweet){
      // find hashtags
      if (withinXDays(tweet.created_at, config.recency.hashtags) && tweet.entities.hashtags.length) {
        hashtags = hashtags.concat(_.map(tweet.entities.hashtags, function(hashtagObj) {
          return hashtagify(hashtagObj.text);
        }));
        // populate smartListReasonsByTerm
        _.each(tweet.entities.hashtags, function(hashtagObj){
          var term = hashtagObj.text.toLowerCase();
          if (!smartListReasonsByTerm[term]) {
            smartListReasonsByTerm[term] = [];
            smartListReasonsByTerm[term].push('You used the hashtag #'+term+' within the last '+config.recency.hashtags+' days');
          }
        });
      }

      // find mentions and replies and retweets
      if (withinXDays(tweet.created_at, config.recency.usersYouInteractWith) && tweet.entities.user_mentions.length) {
        users = users.concat(_.map(tweet.entities.user_mentions, function(userObj) {
          return userObj.screen_name;
        }));
        // populate smartListReasonsByTerm
        _.each(tweet.entities.user_mentions, function(userObj){
          var term = userObj.screen_name;
          var action;
          if (tweet.text.indexOf('RT '+term) === 0) {
            action = 'retweeted';
          } else if (tweet.text.indexOf(term) === 0) {
            action = 'replied to';
          } else {
            action = 'mentioned';
          }
          populateTermReason(term, action, 'You '+action+' @'+term+' within the last '+config.recency.usersYouInteractWith+' days');
        });
      }
    });

    inspectFeed(mentions, function(tweet){
      // users who mention,reply to, retweet you
      if (withinXDays(tweet.created_at, config.recency.usersInteractingWithYou)) {
        users.push(tweet.user.screen_name);
        // populate smartListReasonsByTerm
        var term = tweet.user.screen_name;
        var authenticatedUser = '@'+userTweets[0].user.screen_name;
        var action;
        if (tweet.text.indexOf('RT '+authenticatedUser) === 0) {
          action = 'retweeted you';
        } else if (tweet.text.indexOf(authenticatedUser) === 0) {
          action = 'replied to you';
        } else {
          action = 'mentioned you';
        }
        populateTermReason(term, action, '@'+term+' '+action+' within the last '+config.recency.usersInteractingWithYou+' days');
      }
    });

    inspectFeed(favorites, function(tweet) {
      // get users from tweets you favorited
      if (withinXDays(tweet.created_at, config.recency.usersYouInteractWith)) {
        users.push(tweet.user.screen_name);
        // populate smartListReasonsByTerm
        var term = tweet.user.screen_name;
        populateTermReason(term, 'favorited', 'You favorited @'+term+' within the last '+config.recency.usersYouInteractWith+' days');
      }
    });

    // Note, Twitter doesn't give us a date on when friend connections were established, so we cant people we followed, or who followed us withing the last X days.
    // Instead, here is a work around that kind of makes since (though this will break if twitter stops sending followers and friends in order of most recent!):
    // last 3 people we followed
    // last 5 people who followed us that we also follow

    // add last 5 users who followed you who you also follow
    var recentFollowers = _.chain(followers.users).filter(function(user) {return user.following;}).take(config.recency.followers).pluck('screen_name').value();
    users = users.concat(recentFollowers);
    // populate smartListReasonsByTerm
    _.each(recentFollowers, function(screen_name){
      var term = screen_name;
      populateTermReason(term, 'followed you', '@'+term+' is one of your last '+config.recency.followers+' friends who followed you back');
    });

    // add last 3 users you followed
    var recentlyFollowed = _.chain(friends.users).filter(function(user) {return user.following;}).take(config.recency.followed).pluck('screen_name').value();
    users = users.concat(recentlyFollowed);
    // populate smartListReasonsByTerm
    _.each(recentlyFollowed, function(screen_name){
      var term = screen_name;
      populateTermReason(term, 'followed', '@'+term+' is one of the last '+config.recency.followed+' people you followed');
    });

    // add terms to smartlist (_.union avoids duplicates)
    smartList = _.union(smartList, hashtags, users);
  },

  /*
  Searches each tweet text in timeline object (from twitter api) for terms in smartList, adding a `minimized` property on the tweet object equal to `true` if not found
  */
  filterTimeline: function (timeline, user, cookies) {
    console.log('filterTimeline using smart list:', smartList);

      /* optimized way to search our array of tweets against our array of terms? here are some attempts:
        1. nested loop - inefficient.
        2. join search terms with '|' and use as a regex for each tweet text - may be good
        3. use node wrapped grep somehow?? not sure how to do
        4. hang out with smart mathematicians for super optimized algorithm

        Results: regex beats nested loop, so going with that, tests at http://jsfiddle.net/Y4LUb/
      */
      var pattern = new RegExp(smartList.join('|'),'igm');
      for (var i = config.firstFew; i < timeline.length; i++) {
        var matches = (timeline[i].text+' ' +timeline[i].user.screen_name).match(pattern);
        if (!matches) {
          timeline[i].minimized = true;
        } else {
          var reasons = [];
          matches = _.chain(matches).map(function(m){return m.toLowerCase();}).uniq().value();
          _.each(matches, function(term){
            reasons = reasons.concat(smartListReasonsByTerm[term.toLowerCase()]);
          });
          timeline[i].spotlightReasons = reasons;
        }
      }
      console.log(smartListReasonsByTerm)

    // linkify inline links
    _.each(timeline, function(tweet){
      _.each(tweet.entities.urls, function(urlObj){
        var link = '<a href="'+urlObj.expanded_url+'">'+urlObj.display_url+'</a>';
        tweet.text = tweet.text.split(urlObj.url).join(link);
      });
    });

    // Inject app specific messages for "inline messages"
    // welcome/use
    var basicTweet = {
      user: {
        screen_name: 'TimelineSpotlight',
        name: 'Twitter Timeline Spotlight',
        profile_image_url_https: '/images/logo/drawable-mdpi/ic_launcher.png',
      },
      classes: 'system-tweet',
      id_str: '#',
      created_at: new Date(),
      text: ""
    };

    var prependTweets = [
      "Welcome @"+user.screenName+" to Twitter Timeline Spotlight!  Below are all your tweets, with a spotlight on the most relevant ones.",
      "Tweets are spotlighted based on your recent actions on Twitter.  You can set your options to adjust what gets spotlighted."
    ];
    
    var appendTweets = [
      "Thanks for using Twitter Timeline Spotlight.  If you enjoyed it, tweet about it!  I also welcome any feedback.<br>"+
      '<a href="https://twitter.com/share" class="twitter-share-button" data-text="Working on a Twitter Timeline Spotlight app, stay tuned..." data-via="jschomay" data-size="large">Tweet</a>'+
      "<script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+'://platform.twitter.com/widgets.js';fjs.parentNode.insertBefore(js,fjs);}}(document, 'script', 'twitter-wjs');</script>"+
      '<form class="feedback-form"><textarea name="textarea" rows="5" cols="50">Feedback from @'+user.screenName+':&#13;&#10;</textarea><br><input class="submit" type="submit" name="submit" value="Send feedback" /></form>',
    ];

    function buildAppTweets (tweetList) {
      return _.map(tweetList, function (tweet) { return _.extend({}, basicTweet, {text:tweet}); });
    }

    lastVisit = cookies.ttslastvisit;
    // daysSinceLastVisit = (new Date().getTime() - parseInt(lastVisit, 10))/1000/60/60;
    if (!lastVisit) {
      timeline = buildAppTweets(prependTweets).concat(timeline);
    }
    timeline = timeline.concat(buildAppTweets(appendTweets));

    return timeline;
  }
};

// debug mode
if (DEBUG) {
  console.log("Using debug mode");
  spotlight.makeSmartList = makeTimedFunction(spotlight.makeSmartList, 'makeSmartList');
  spotlight.filterTimeline = makeTimedFunction(spotlight.filterTimeline, 'filterTimeline');
}

// functional util to make a function time itself
function makeTimedFunction(fn, lable) {
  // handle unnamed functions (like unnamed methods)
  if (!lable && !fn.name) {
    lable = 'timing unnamed function'
  }
  return function(){
    console.time(lable || 'time to complete '+fn.name);
    var results = fn.apply(fn,Array.prototype.slice.call(arguments));
    console.timeEnd(lable || 'time to complete '+fn.name);
    return results;
  };
}