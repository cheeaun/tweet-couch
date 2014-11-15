#! /app/bin/node

var path = require('path');
var nconf = require('nconf');
nconf.argv()
	.env()
	.file(path.join(__dirname, 'config.json'))
	.defaults({
		user_id: '',
		couchdb_url: 'http://localhost:5984',
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

var nano = require('nano')(nconf.get('couchdb_url'));
var tweets = nano.use('tweets');

tweets.view('tweets', 'by_created_date', {
	limit: 1,
	descending: true
}, function(e, body){
	if (e) throw e;
	if (body.rows && body.rows.length){
		var url = 'statuses/user_timeline';
		var since_id = body.rows[0].id;

		console.log('Requesting ' + url);
		twit.get(url, {
			user_id: user_id,
			since_id: since_id,
			count: 200,
			include_rts: true
		}, function(e, data){
			if (e){
				throw e;
				return;
			}

			data.forEach(function(d){
				d._id = d.id_str; // doc _id
			});
			tweets.bulk({docs: data}, function(err, response){
				if (err) throw err;
				var docIds = response.map(function(r){
					return r.id;
				});
				if (docIds.length) console.log(docIds.length + ' doc(s) added: ' + docIds.join(', '));
			});
		});
	}
});
