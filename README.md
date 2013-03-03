Tweet Couch
===========

Archive your tweets in a relaxing way.

Setup - Import to CouchDB
-------------------------

 1. Request and download your Twitter Archive file, from the Twitter Settings page.
 2. Extract the files somewhere e.g. `~/Desktop/tweets`.
 3. Git clone or download this repo.
 4. In a terminal, go to repo directory, and do this:

    	npm install

 5. To test this locally, install [CouchDB](http://couchdb.apache.org/) and start it. Else, get a hosted CouchDB instance. I use [Cloudant](https://cloudant.com/), create a new database called `tweets` and set its permissions to read-only for `Everyone else`.
 6. To import the Archive data into CouchDB, do the steps below.

		node scripts/archive2couch.js -h # Shows help
		node scripts/archive2couch.js -f <data/js/tweets folder> -c <http://user:pass@localhost:5984>

 7. After the import is done, do this to create the design views:

		node scripts/create-views.js -c <http://user:pass@localhost:5984>

 8. You're basically done. You can manually update CouchDB on a periodical basis by going through these steps again. Optionally, you can continue with the steps below to host this app on Heroku and run the updater on [Scheduler](https://devcenter.heroku.com/articles/scheduler) to sync the latest tweets from Twitter to CouchDB.

Setup - Heroku Scheduler to sync tweets to CouchDB
--------------------------------------------------

 1. Fill up the config required. This app uses [nconf](https://github.com/flatiron/nconf), thus there can be multiple configuration sources e.g. `process.argv`, `process.env` and `config.json`. For Heroku, it's recommended to use environment variables. To get your Twitter user ID, use [idfromuser.com](http://www.idfromuser.com/). See notes below to know what `supertweet_auth` does.

		heroku config:set user_id=<1234>
		heroku config:set supertweet_auth=user:pass
		heroku config:set couchdb_url=http://user:pass@localhost:5984

 2. Deploy this app to Heroku.
 4. Check if things are working by doing this:

		heroku run node twitter2couch.js

 3. Add [Heroku Scheduler](https://addons.heroku.com/scheduler).
 4. Go to add-on page, add a job, set task to `node twitter2couch.js`, at an **hourly** frequency. Save.
 5. You're done. Make sure it works properly by doing `heroku logs`.

Setup - UI for the tweets archive
---------------------------------

 Go to [github.com/cheeaun/tweets](http://github.com/cheeaun/tweets).

Important Notes
---------------

 1. I assume the archived tweets are from a **Public** account. The steps above might differ slightly for private account users. Pull requests are welcomed.
 2. The app uses [SuperTweet](http://www.supertweet.net/) service for fetching tweets because Twitter API 1.1 enforces OAuth which is a little troublesome compared to SuperTweet's Basic Authentication. Just sign up there and use the provided credentials for `supertweet_auth`.
 3. In Cloudant, you can set up a different username and password to be used for `couchdb_url`. Go to `Permissions` page and click `Generate API key`. The API key is also the username.
 4. The JSON responses from Twitter API are more detailed than the ones provided by Twitter Archive. Everything should still work nevertheless.

License
-------

Licensed under the [MIT License](http://cheeaun.mit-license.org/).

Similar projects
----------------

- Tweet Nest (PHP + MySQL) <https://github.com/graulund/tweetnest> - with many forks that support Twitter Archive
- Archive My Tweets (PHP + MySQL) <https://github.com/amwhalen/archive-my-tweets>
- Tweetarchive (Go + PostgreSQL) <https://github.com/paulsmith/tweetarchive>
- ElasticTweets (ElasticSearch) <https://github.com/AdaTheDev/ElasticTweets>
- GrailbirdUpdater (Ruby) <https://github.com/DeMarko/grailbird_updater>
- Twimo (Node.js + MongoDB) <https://github.com/rowanmanning/twimo>
- Twarch (PHP + SQLite) <https://github.com/TomNomNom/twarch>
- Twive (PHP + MySQL) <https://github.com/robhogg/twive>
- TwitterToWord (Java) <https://github.com/odessa2/TwitterToWord>
- Parse Twitter Archive (Python) <https://github.com/mshea/Parse-Twitter-Archive>
- Couch-tweet-archiver (Node.js + CouchDB) <https://github.com/mlc/couch-tweet-archiver>
- TweetDen (Ruby + MongoDB) <https://github.com/philoye/tweetden>