var smartList = ['@jschomay'];

module.exports = spotlight = {
  /*
  Array of terms pulled from user's tweets and actions
  */
  smartList: function (){ return smartList;},

  /*
  Adds terms to this.smartList from passed in data from twitter
  */
  makeSmartList: function (activity) {
    console.log('makeSmartList')
    // test data 'game'
    // note - could separate out users and text filters, but for now we'll lump them together and let filterTimeline handle it
    smartList.push('game', 'awesome', 'code', 'SimoRoth');
    // TODO parse activity tweets
    // TODO get other needed tweet streams to parse
  },

  /*
  Searches each tweet text in timeline object (from twitter api) for terms in this.smartList, adding a `minimized` property on the tweet object equal to `true` if not found
  */
  filterTimeline: function (timeline) {
    console.log('filterTimeline using smart list:', smartList)

      /* optimized way to search our array of tweets against our array of terms? here are some attempts:
        1. nested loop - inefficient.
        2. join search terms with '|' and use as a regex for each tweet text - may be good
        3. use node wrapped grep somehow?? not sure how to do
        4. hang out with smart mathematicians for super optimized algorithm

        Results: regex beats nested loop, so going with that, tests at http://jsfiddle.net/Y4LUb/
      */
      var pattern = new RegExp(smartList.join('|'),'i');
      for (var i = 0; i < timeline.length; ++i) {
        if (!pattern.test(timeline[i].text+' ' +timeline[i].user.screen_name)) {
          // console.log('"',timeline[i].text.match(pattern)[0],'" is in ->',timeline[i].text);
          timeline[i].minimized = true;
        }
      }
    return timeline;
  }
};