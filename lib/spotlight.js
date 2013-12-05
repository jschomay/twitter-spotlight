var DEBUG = true;

var _ = require('underscore');

var smartList = [];

var config = {
      firstFew: 0, // how many tweets to always show expanded at top of feed
      enforceHashtagMatches: false, // spotlight tweets with words/screennames matching user's tweeted hashtags, or only spotlight if they use the hashtag
      recency: {
        hashtags: 10, // in days
        usersYouInteractWith: 15,
        usersInteractingWithYou: 10,
        newFollows: 5,
      },
};

module.exports = spotlight = {
  /*
  Array of terms pulled from user's tweets and actions
  */
  getSmartList: function (){ return smartList;},

  /*
  Adds terms to smartList from passed in data from twitter

  Smartlist conditions:
    * Top 3 tweets on your timeline always expanded (to see what is freshest, unfiltered)
    * New people you followed in past 5 days ("recency periods" are configurable)
    * All people you have interactions with in last 15 days:
      * Users you: retweeted, replied to, mentioned, favorited a tweet of
      * Users who: followed, retweeted, replied to, mentioned, favorited you (the api doesn't tell who favorited tweets currently)
    * Tweets with hashtags you have used in the last 10 days
    * Manual "always spotlight this user" (maybe, need to persist it somewhere)
  */
  makeSmartList: function (userTweets, mentions) {

    function withinXDays(date, daysAgo) {
      return (new Date() - new Date(date))/(1000*60*60*24) < daysAgo;
    }

    function hashtagify (term) {
      return (config.enforceHashtagMatches ? '#' : '') + term;
    }

    // terms to add to smart list
    var hashtags = [], users = [];

    // inspect user's tweets feed for...
    for (var i = 0; i < userTweets.length; i++) {
      // ... hashtags
      if (withinXDays(userTweets[i].created_at, config.recency.hashtags) && userTweets[i].entities.hashtags.length) {
        hashtags = hashtags.concat(_.map(userTweets[i].entities.hashtags, function(hashtagObj) {
          return hashtagify(hashtagObj.text);
        }));
      }

      // ... mentions and replies...
      // ... and retweets?  Do all retweets have the username in the text?  What about quote vs retweet?  May need to also look for the retweeted property and dig into retweeted_status TODO - test it
      if (withinXDays(userTweets[i].created_at, config.recency.usersYouInteractWith) && userTweets[i].entities.user_mentions.length) {
        users = users.concat(_.map(userTweets[i].entities.user_mentions, function(userObj) {
          return userObj.screen_name;
        }));
      }
      // This definitely grabs the user you have retweeted
      if (withinXDays(userTweets[i].created_at, config.recency.usersYouInteractWith) && userTweets[i].retweeted) {
        users.push(userTweets[i].retweeted_status.user.screen_name); //original tweeter
      }
    }


    // inspect mentions feed for...
    for (var i = 0; i < mentions.length; i++) {

      // ... users who mention,reply to, retweet you
      // not sure if this actually gets retweets, may have to import retweets_of_me api data too
      if (withinXDays(mentions[i].created_at, config.recency.usersInteractingWithYou)) {
        users.push(mentions[i].user.screen_name);
      }


      // TODO:
      // new users you followed
      // users who followed you
      // tweets you favorited
    }

    // TODO - ring in retweets_of_me api data to get users who retweeted me

    // add terms to smartlist (_.union avoids duplicates)
    smartList = _.union(smartList, hashtags, users);
  },

  /*
  Searches each tweet text in timeline object (from twitter api) for terms in smartList, adding a `minimized` property on the tweet object equal to `true` if not found
  */
  filterTimeline: function (timeline) {
    console.log('filterTimeline using smart list:', smartList);

      /* optimized way to search our array of tweets against our array of terms? here are some attempts:
        1. nested loop - inefficient.
        2. join search terms with '|' and use as a regex for each tweet text - may be good
        3. use node wrapped grep somehow?? not sure how to do
        4. hang out with smart mathematicians for super optimized algorithm

        Results: regex beats nested loop, so going with that, tests at http://jsfiddle.net/Y4LUb/
      */
      var pattern = new RegExp(smartList.join('|'),'i');
      for (var i = config.firstFew; i < timeline.length; i++) {
        if (!pattern.test(timeline[i].text+' ' +timeline[i].user.screen_name)) {
          timeline[i].minimized = true;
        }
      }
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