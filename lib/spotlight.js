var smartList = ['@jschomay'];

module.exports = spotlight = {
  smartList: function (){ return smartList;},
  makeSmartList: function (activity) {
    console.log('makeSmartList')
    // test data 'game'
    smartList.push('game');
    // TODO parse activity tweets
    // TODO get other needed tweet streams to parse
  },
  filterTimeline: function (timeline) {
    console.log('filterTimeline using smart list:', smartList)
    for (var i = timeline.length - 1; i >= 0; i--) {
      console.log('Timeline item '+i+':',timeline[i].text);
      if (/game/i.test(timeline[i].text))
        timeline[i].text = 'XXXX '+timeline[i].text;
      // TODO test against each item in smart list
      // how can that be optimized....?
    }
    return timeline;
  }
};