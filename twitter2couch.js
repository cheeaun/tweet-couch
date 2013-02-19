#! /app/bin/node

var path = require('path');
var nconf = require('nconf');
nconf.argv()
	.env()
	.file(path.join(__dirname, '../', 'config.json'))
	.defaults({
		user_id: '',
		supertweet_auth: 'user:pass',
		couchdb_url: 'http://localhost:5984'
	});

var user_id = nconf.get('user_id');
var auth = nconf.get('supertweet_auth');

var http = require('http');
var qs = require('querystring');
var nano = require('nano')(nconf.get('couchdb_url'));
var tweets = nano.use('tweets');

tweets.view('tweets', 'by_created_date', {
	limit: 1,
	descending: true
}, function(e, body){
	if (e) throw e;
	if (body.rows && body.rows.length){
		var since_id = body.rows[0].id;

		var host = 'api.supertweet.net';
		var params = {
			user_id: user_id,
			since_id: since_id,
			count: 200,
			include_rts: true
		};
		var path = '/1.1/statuses/user_timeline.json?' + qs.stringify(params);
		console.log('Requesting ' + host + path);
		var request = http.get({
			host: host,
			path: path,
			auth: auth
		});

		request.on('response', function(response){
			if (response.statusCode != 200){
				console.error('Response not 200 OK');
				console.error(response);
				return;
			}

			var body = '';
			response.on('data', function(chunk){ body += chunk });
			response.on('end', function(){
				var data = JSON.parse(body);
				if (data && data.length >= 1){
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
				}
			});
		}).on('error', function(e){
			throw e;
		});
	}
});