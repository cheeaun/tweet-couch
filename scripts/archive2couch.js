#!/usr/bin/env node

var program = require('commander');

program
	.option('-f, --folder <path>', 'path to the data/js/tweets folder of extracted Twitter archive')
	.option('-c, --couchdb <url>', 'url to the CouchDB server, defaults to localhost:5984')
	.parse(process.argv);

if (!program.folder){
	console.error('Path to folder not specified.');
	return;
}

var fs = require('fs');
var path = require('path');
var folder = path.normalize(program.folder);
var nano = require('nano')(program.couchdb || 'http://localhost:5984');

fs.readdir(folder, function(err, files){
	if (err) throw err;
	var jsFiles = files.filter(function(file){
		return /\.js$/i.test(file);
	});

	console.log('Found ' + jsFiles.length + ' JS(ON) file(s) in this folder.');

	var Grailbird = {data: {}};
	jsFiles.forEach(function(js){
		console.log('Reading ' + js);
		var content = fs.readFileSync(folder + path.sep + js, 'utf-8');
		if (content && /grailbird\.data/i.test(content)){
			eval(content);
		}
	});
	var docs = [];
	var dataKeys = Object.keys(Grailbird.data);
	dataKeys.forEach(function(key){
		var d = Grailbird.data[key];
		docs = docs.concat(d);
	});

	console.log('There\'s a total of ' + docs.length + ' tweets.');

	console.log('Now upload them all to CouchDB.');

	var docsIds = {};
	docs.forEach(function(d){
		var id = d._id = d.id_str; // doc _id
		docsIds[id] = d;
	});

	console.log('Creating DB...');
	nano.db.create('tweets', function(){
		var tweets = nano.use('tweets');
		console.log('Grabbing all docs from DB...');
		tweets.list(function(err, body){
			if (body.total_rows > 0){ // For subsequent imports
				console.log('Total docs in DB: ' + body.total_rows);
				body.rows.forEach(function(r){
					if (/^_design/i.test(r.id)) return; // Ignore design documents
					var doc = docsIds[r.id];
					if (doc){
						doc._rev = r.value.rev; // Update rev so that CouchDB knows it's updated
					} else {
						/*
							If tweets in CouchDB are not found in Archive, two possible use-cases:
							1. They might have been deleted.
							2. The Archive is outdated or has older data than CouchDB
							Anyway, we won't delete them here.
						*/
						console.info('Doc id:' + r.id + ' is not found in Archive.');
					}
				});
			} else {
				console.log('Looks like no docs in DB...');
			}

			console.log('Let\'s bulk upload the docs to CouchDB!');
			tweets.bulk({docs: docs}, function(e, response){
				var errorIDs = response.filter(function(r){
					return !!r.error;
				}).map(function(r){
					return r.id;
				});
				if (errorIDs.length){
					console.error('Errors in these IDs: ' + errorIDs.join(', '));
				} else {
					console.log('Looks like it works. Everything\'s done!');
				}
			});
		});
	});
});
