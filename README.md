# npm-heat-cache

Simple wrapper around the pagelet resolve function in order to preheat the
cache. Getting data for a package page can consume a lot of resources. Each
resolved package can take up to 10 token requests.

Most of the code logic is courtesy of @swaagie

```js

var PreHeat = require('npm-heat-cache');

var options = {
  redis: { auth: 'my_password', host: 'whatever.com', port: 6379 },
  couchdb: { database: 'browsenpm', host: 'localhost', port: 5984 },
  tokens: ['some github tokens'],
  registry: 'https://registry.nodejitsu.com'
};

//
// Create a preheat intance
//
var preheat = new PreHeat(options);

preheat.on('error', function (err) {
  // handle redis errors if we care to
});

preheat.cache('bigpipe', function (err) {
  if(err) {
    throw err; // what the fuck
  }
  console.log('successfully preheated!');
});
```