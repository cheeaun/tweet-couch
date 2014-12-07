#!/usr/bin/env node

var program = require('commander');

program
	.option('-c, --couchdb <url>', 'url to the CouchDB server, defaults to localhost:5984')
	.parse(process.argv);

var fs = require('fs');
var path = require('path');
var folder = path.normalize(program.folder);
var nano = require('nano')(program.couchdb || 'http://localhost:5984');
var tweets = nano.use('tweets');
var moment = require('moment');

var nconf = require('nconf');
nconf.env()
	.file(path.join(__dirname, '../config.json'))
	.defaults({
		user_id: '',
		consumer_key: '',
		consumer_secret: '',
		access_token: '',
		access_token_secret: ''
	});

var user_id = nconf.get('user_id');
var Twit = require('twit');
var twit = new Twit({
	consumer_key: nconf.get('consumer_key'),
	consumer_secret: nconf.get('consumer_secret'),
	access_token: nconf.get('access_token'),
	access_token_secret: nconf.get('access_token_secret')
});

tweets.view('tweets', 'undated_tweets', {include_docs: true}, function(e, body){
	if (e) throw e;
	var rows = body.rows;

	if (!rows || !rows.length){
		console.log('Cool, everything seems fine and no need to fix them. Yay!');
		return;
	}

	console.log('There\'s a total of ' + rows.length + ' tweets needed to be fixed.');

	var docs = {};
	rows.forEach(function(row){
		docs[row.id] = row.doc;
	});

	var chunk = 100;
	for (var i=0, l=rows.length; i<l; i+=chunk){

		(function(i){
			var chunkedRows = rows.slice(i, i+chunk);
			var ids = chunkedRows.map(function(r){
				return r.id;
			}).join(',');

			setTimeout(function(){
				console.log('Looking up Twitter statues...');

				twit.get('statuses/lookup', {
					id: ids,
					trim_user: true
				}, function(e, data){
					console.log('Tweets returned from API: ' + data.length);
					var newDocs = [];
					data.forEach(function(d){
						var doc = docs[d.id_str];
						var newCreatedAt = moment(new Date(d.created_at)).utc().format('YYYY-MM-DD HH:mm:ss ZZ');
						if (doc.created_at != newCreatedAt){
							// console.log(d.id_str + '\t' + doc.created_at + ' => ' + newCreatedAt);
							doc.created_at = newCreatedAt;
							newDocs.push(doc);
						} else {
							console.error('Tweet ' + d.id_str + ' does not have a new created_at date!');
							console.log('Tweet from API shows ' + d.created_at + ' parsed into ' + newCreatedAt);
						}
					});

					console.log('Updating ' + newDocs.length + ' doc(s)...');

					// After done comparing and applying new dates, let's bulk update all docs!
					tweets.bulk({docs: newDocs}, function(err, response){
						if (err) throw err;
						var errorIDs = response.filter(function(r){
							return !!r.error;
						}).map(function(r){
							return r.id;
						});
						if (errorIDs.length){
							console.error('Errors in these IDs: ' + errorIDs.join(', '));
						} else {
							console.log('Cool, ' + newDocs.length + ' doc(s) updated.');
						}
					});
				});
			}, i*20); // Every 2 seconds? Be nice to Twitter API
		})(i);
	}
});
