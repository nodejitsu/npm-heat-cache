
var EE = require('events').EventEmitter,
    util = require('util'),
    redis = require('redis'),
    cradle = require('cradle'),
    Pagelet = require('packages-pagelet'),
    Registry = require('npm-registry'),
    Dynamis = require('dynamis'),
    Githulk = require('githulk');


module.exports = PreHeat;

util.inherits(PreHeat, EE);

function PreHeat (options) {
  options = options || {};
  if (!options.couchdb || !options.redis || !options.tokens) {
    throw new Error('This requires redis, couchdb, and tokens option');
  }

  options.registry = options.registry || 'https://registry.nodejitsu.com';

  this.options = options;

  this.couchdb = new (cradle).Connection(options.couchdb);
  this.redis = options.redis instanceof redis.RedisClient
    ? options.redis
    : redis.createClient(options.redis.port, options.redis.host,
                                  { auth_pass: options.redis.auth });

  this.githulk = new Githulk({
    cache: new Dynamis('cradle', this.couchdb, options.couchdb),
    tokens: options.tokens
  });

  this.redis.on('error', this.emit.bind(this, 'error'));

  this.registry = new Registry({
    githulk: this.githulk,
    registry: options.registry
  });

  this.prefix = options.private
    ? options.registry + ':private:'
    : '';

  this.pagelet = new (Pagelet.extend({
    cache: new Dynamis('redis', this.redis, options.redis),
    registry: this.registry,
    githulk: this.githulk,
    key: this.key.bind(this)
  }).optimize());

}

PreHeat.prototype.key = function (name, version) {
  return this.prefix + Pagelet.prototype.key.call(this, name, version);
};

//
// Take the package name, resolve it and its dependencies and cache it.
// Allow a registry host to also be passed in
//
PreHeat.prototype.cache = function (package, callback) {
  this._callback = callback && typeof callback === 'function'
    ? callback
    : undefined;

  this.pagelet.latest(package, this._onLatest.bind(this, package));
};

PreHeat.prototype._onLatest = function (package, err, version) {
  if (err) { return this.onError(err); }
  var key = this.pagelet.key(package, version);
  console.log(key);
  this.pagelet.fireforget('get', key, this._onFetch.bind(this, key, package));
};

PreHeat.prototype._onFetch = function (key, package, err, data) {
  if (err) { return this.onError(err) }
  if (!err && data) { return this.done() }

  // Allow host to override the registry instance so a new one is created
  // with the proper URL
  this.pagelet.resolve(package, {
    registry: this.registry,
    githulk: this.githulk
  }, this._onResolved.bind(this, key));
};

PreHeat.prototype._onResolved = function (key, err, data) {
  if (err) { return this.onError(err) }
  this.pagelet.fireforget('set', key, data,
                          this.pagelet.expire.data,
                          this.answer.bind(this));
};

PreHeat.prototype.answer = function (err) {
  return err
    ? this.onError(err)
    : this.done();
};

PreHeat.prototype.done = function () {
  return this._callback
    ? this._callback()
    : this.emit('done');
};

PreHeat.prototype.onError = function (err) {
  return this._callback
    ? this._callback(err)
    : this.emit('error', err);
};
