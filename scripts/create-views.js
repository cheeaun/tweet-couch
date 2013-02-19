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
					var date = new Date(doc.created_at);
					var month = date.getMonth()+1;
					if (month<10) month = '0' + month;
					emit(date.getFullYear() + '-' + month, 1);
				},
				reduce: function(keys, values, rereduce){
					return sum(values);
				}
			},
			by_created_date: {
				map: function(doc){
					var date = new Date(doc.created_at);
					emit([
						date.getFullYear(),
						date.getMonth()+1,
						date.getDate(),
						date.getHours(),
						date.getMinutes(),
						date.getSeconds()
					], null);
				}
			},
			media: {
				map: function(doc){
					var media = doc.entities.media;
					if (media.length){
						var date = new Date(doc.created_at);
						emit([
							date.getFullYear(),
							date.getMonth()+1,
							date.getDate(),
							date.getHours(),
							date.getMinutes(),
							date.getSeconds()
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
					index('default', text);
					index('from', screen_name);
					if (in_reply_to_screen_name) index('to', in_reply_to_screen_name);

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