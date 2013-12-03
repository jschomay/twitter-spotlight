var _ = require('underscore');

var smartList = [];

var config = {
      firstFew: 3, // how many tweets to show expanded at top of feed
      enforceHashtagMatches: false, // spotlight tweets with words/screennames matching user's tweeted hashtags, or only spotlight if they use the hashtag
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
      * Users you: followed, retweeted, replied to, mentioned, favorited a tweet of
      * Users who: followed, retweeted, replied to, mentioned, favorited you
    * Tweets with hashtags you have used in the last 10 days
    * Manual "always spotlight this user" (maybe, need to persist it somewhere)
  */
  makeSmartList: function (userTweets, activity) {
    console.time('makeSmartList');

    function hastagify (term) {
      return (config.enforceHashtagMatches ? '#' : '') + term;
    }

    // terms to add to smart list
    var hashtags = [], users = [];

    // inspect user's tweets for...
    for (var i = 0; i < userTweets.length; i++) {
      // ... hashtags
      if (userTweets[i].entities.hashtags.length)
        hashtags = hashtags.concat(_.map(userTweets[i].entities.hashtags, function(hashtagObj) {
          return hastagify(hashtagObj.text);
        }));
      // ... mentions and retweets
      // TODO
    }

    // add terms to smartlist (_.union avoids duplicates)
    smartList = _.union(smartList, hashtags, users);
    console.timeEnd("makeSmartList")
  },

  /*
  Searches each tweet text in timeline object (from twitter api) for terms in smartList, adding a `minimized` property on the tweet object equal to `true` if not found
  */
  filterTimeline: function (timeline) {
    console.time('filterTimeline');
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
    console.timeEnd('filterTimeline');
    return timeline;
  }
};