#!/usr/bin/env node

var program = require('commander');

program
	.option('-c, --couchdb <url>', 'url to the CouchDB server, defaults to localhost:5984')
	.parse(process.argv);

var nano = require('nano')(program.couchdb);
var tweets = nano.use('tweets');

var designDoc = '_design/tweets';
tweets.get(designDoc, function(err, body){
	var doc = {
		views: {
			monthly_total: {
				map: function(doc){
					var datemonth = (doc.created_at.match(/^(\d{4}\-\d{2})\-/) || [,null])[1];
					if (datemonth) emit(datemonth, 1);
				},
				reduce: function(keys, values, rereduce){
					return sum(values);
				}
			},
			by_created_date: {
				map: function(doc){
					var date = doc.created_at.match(/^(\d{4})\-(\d{2})\-(\d{2})\s(\d+):(\d+):(\d+)/);
					emit([
						parseInt(date[1], 10),
						parseInt(date[2], 10),
						parseInt(date[3], 10),
						parseInt(date[4], 10),
						parseInt(date[5], 10),
						parseInt(date[6], 10),
					], null);
				}
			},
			media: {
				map: function(doc){
					var media = doc.entities.media;
					if (media.length){
						var date = doc.created_at.match(/^(\d{4})\-(\d{2})\-(\d{2})\s(\d+):(\d+):(\d+)/);
						emit([
							parseInt(date[1], 10),
							parseInt(date[2], 10),
							parseInt(date[3], 10),
							parseInt(date[4], 10),
							parseInt(date[5], 10),
							parseInt(date[6], 10),
						], null);
					}
				}
			}
		},
		// For Cloudant's Search
		indexes: {
			tweets: {
				index: function(doc){
					var text = doc.text;
					var screen_name = doc.user.screen_name;
					var in_reply_to_screen_name = doc.in_reply_to_screen_name;
					var retweeted_status = doc.retweeted_status;
					if (retweeted_status){
						text = retweeted_status.text;
						screen_name = retweeted_status.user.screen_name;
						if (retweeted_status.in_reply_to_screen_name){
							in_reply_to_screen_name = retweeted_status.in_reply_to_screen_name;
						}
					}
					index('retweeted', !!retweeted_status);
					index('default', text);
					index('from', screen_name);
					if (in_reply_to_screen_name) index('to', in_reply_to_screen_name);

					var date = doc.created_at.match(/^(\d{4})\-(\d{2})\-(\d{2})\s(\d+):(\d+):(\d+)/);
					var year = parseInt(date[1], 10);
					var month = parseInt(date[2], 10) - 1;
					var day = parseInt(date[3], 10);
					var hour = parseInt(date[4], 10);
					var min = parseInt(date[5], 10);
					var sec = parseInt(date[6], 10);
					index('created_at', +new Date(year, month, day, hour, min, sec));

					if (doc.entities){
						if (doc.entities.hashtags && doc.entities.hashtags.length){
							doc.entities.hashtags.forEach(function(h){
								index('hashtag', h.text);
							});
						}
						if (doc.entities.urls && doc.entities.urls.length){
							doc.entities.urls.forEach(function(u){
								index('url', u.expanded_url);
							});
						}
					}
				}
			}
		}
	};
	if (!err) doc._rev = body._rev;
	tweets.insert(doc, designDoc, function(){
		console.log(arguments);
	});
});