
var Preheat = require('../'),
    config = require('../development.json');

var preheat = new Preheat(config);

preheat.on('error', function (err) {
    console.error(err);
});

preheat.cache('primus', function (err, data) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
});
