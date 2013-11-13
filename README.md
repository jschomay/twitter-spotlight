A simple node.js based Twitter client to experiment with a specific home timeline interface feature:

Twitter Timeline Spotlight
==========================

_Intelligently emphasize the tweets on your twitter timeline that matter most to you, based on your recent behavior_


 The idea
 --------
 
 Twitter is great, but it's hard to keep up with all the tweets that keep popping up on your timeline.  Sometimes tweets that I care about get lost in the mix of other tweets from people that I want to follow, but am less focused on at the time.  
 
 Sure, I could create lists based on people, hashtags, and searches, and I could use another app/site that lets me see different lists at different times in different ways, but I want something a little simpler, and more integrated.  And I want it to work automatically, and intelligently, base on my behavior.
 
 Enter Twitter Timeline Spotlight.  It does two things:

 1. __"Smart list"__ - by analyzing your recent tweets, interactions, and connections, the algorithm determines what tweets you will be most interested in.

 2. __"Spotlight view"__ - modifies your normal home timeline, leaving tweets that match your smart list untouched, but shrinking all the other tweets to single truncated lines with minimized profile pictures.  This way you can still see all the tweets in your feed (and expand any minimized tweets), but the tweets you care about stick out.


 Execution/Algorithm
 ---------
 
 As far as the Twitter client functionality, I'm just doing the bare minimum with node.js (using the oAuth npm module) and backbone on the front end to authenticate with Twitter, load the data I need, and build a simple home feed view.  Since my focus is on the spotlight functionality, I'm not spending much time making awesome twitter client features.
 
Smart list/spotlighted tweets:
- Top 3 tweets on your timeline always expanded (to see what is freshest, unfiltered)
- New people you followed in past 5 days ("recency periods" are configurable)
- All people you have interactions with in last 15 days
  - Users you: followed, retweeted, replied to, mentioned, favorited a tweet of
  - Users who: followed, retweeted, replied to, mentioned, favorited you
- Tweets with hashtags you have used in the last 10 days
- Manual "always spotlight this user" (maybe)
- Any tweet you click on (expands all tweets by that person in the timeline, but doesn't add to smart list unless you interact with them)

Once the smart list is built (either generated each time, or cached somewhere), do any necessary updates/pruning, then build the timeline view, parsing each tweet first against the smart list to determine it's display style.


How to use
----------

Live demo at: comingsoon.com... (sorry, no live demo yet)

Fork and run it yourself.  You'll need to create your own twitter app on their dev site and plug in your own keys in `private-config.js`.

More detail to follow...


Further development
-------------------

Please fork this to improve on it.

Some ideas of where this could go:

 - Fledge out into a more functional/polished web based or mobile twitter client
 - Turn into a Chrome extension that modifies twitter.com's home time line (for the most "native" experience, but you need Chrome)
 - Turn into a mobile app that acts as a plug-in to Twitter's official mobile app (I think I've seen this done before.  This would be my favorite direction to go.)
 - Twitter could implement this feature into their own code ;-)

