
var Preheat = require('../'),
    config = require('../development.json');

var preheat = new Preheat(config);

preheat.on('error', function (err) {
    console.error(err);
});

preheat.cache('primus', function (err, data) {
    process.exit(0);
});
