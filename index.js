const Twit    = require('twit');
const util    = require('util');
const request = require('request');


function fetchGif(query) {
  return new Promise(function(resolve, reject) {
    request.get(`http://api.giphy.com/v1/gifs/translate?s=${encodeURIComponent(query)}&api_key=${process.env.GIPHY_API_KEY}`, function(error, response, body) {
      if (error) reject(error);

      const url = JSON.parse(body).data.images.original.url;

      request.get({ url, encoding: null }, function(error, response, body) {
        if (error) reject(error);

        resolve(body);
      });
    });
  });
}


function post(mediaID) {
  return new Promise(function(resolve, reject) {
    Twitter.post('statuses/update', { media_ids: [mediaID] }, function(err, res) {
      if (err) reject(err);
      resolve(res);
    })
  });
}


function dm(user, text) {
  return new Promise(function(resolve, reject) {
    Twitter.post('direct_messages/new', { screen_name: user, text }, function(err, res) {
      if (err) reject(err);
      resolve(res);
    });
  });
}


function upload(data) {
  return new Promise(function(resolve, reject) {
    Twitter.post('media/upload', { media_data: data.toString('base64') }, function(err, data, response) {
      if (err) reject(err);
      resolve(data.media_id_string);
    });
  });
}


function processMessage(user, query) {
  dm(user, `ok, looking for a '${query}' gif... (powered by giphy!)`);

  return fetchGif(query)
    .then(upload)
    .then(post)
    .then(function(tweet) {
      const url = tweet.entities.media[0].expanded_url;
      return dm(user, url);
    })
    .catch(console.error)
}


const Twitter = new Twit({
  consumer_key:        process.env.TWITTER_KEY,
  consumer_secret:     process.env.TWITTER_SECRET,
  access_token:        process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

const stream = Twitter.stream('user');

stream.on('direct_message', function(payload) {
  const message = payload.direct_message;

  if (message.sender.screen_name === 'gimmeagif')
    return;

  console.log('%s: %s', message.sender.screen_name, message.text.replace('\n', ' '));

  const text = message.text.slice(0, 50);

  processMessage(message.sender.screen_name, text);
});

stream.on('connect', function() {
  console.log('Connecting...');
});

stream.on('disconnect', function() {
  console.log('Disconnected.');
});

stream.on('limit', function() {
  console.log('Rate limited.');
});

stream.on('connected', function() {
  console.log('Connected.');
});
