var path = require('path');
var fs = require('fs');
var resolve = require('app-root-path').resolve;
var readdir = fs.readdirSync;
var lstat = fs.lstatSync;
var exists = fs.existsSync;

function LoadRoutes(app, target, filter) {
  if (!(this instanceof LoadRoutes)) {
    return new LoadRoutes(app, target);
  }
  this.init(app, target, filter);
}

// export module
module.exports = LoadRoutes;

/**
 * Inject the routes and routers into the express instance
 * @param  {Express} app
 * @param  {String} target
 */
LoadRoutes.prototype.init = function(app, target, filter) {
  target = resolve(typeof target === "string" ? target : "routes");
  const emptyHandler = (req, res, next) => next();
  this.readdir(target, filter).forEach(function(file) {
    var route, router;
    route = this.pathToRoute(file, target);
    router = require(file);
    let middleware = emptyHandler;
    if (router && router._) middleware = router._;
    if (router && router.default) router = router.default;
    if (typeof router !== "function") return;
    app.use(route, middleware, router);
  }, this);
};

/**
 * Reads all the files and folder within a given target
 * @param  {String} target
 * @return {Array}
 */
LoadRoutes.prototype.readdir = function(target, filter) {
  var files = [];
  var dirs = [];
  filter = new RegExp(filter || '.*\.js$');

  if (typeof target !== 'string') {
    throw new TypeError('Expecting target path to be a string');
  }

  if (target.charAt(0) === '.') {
    // resolve the target path
    target = path.resolve(path.dirname(module.parent.filename), target);
  }

  // return an empty array if target does not exists
  if (!exists(target)) return files;

  // look for files recursively
  readdir(target).forEach(function(file) {
    var filePath = path.join(target, file);

    if (isFile(filePath)) {
      if(filter.test(file)) files.push(filePath);
    } else {
      dirs.push(filePath);      
    }

  }, this);

  files.sort(function(a, b){
    if(a.indexOf('index.js') != -1){
      return -1;
    }
    if(b.indexOf('index.js') != -1){
      return 1;
    }
    return 0;
  });

  dirs.forEach(function(dir){
    files.push.apply(files, this.readdir(dir));  
  }, this);
  
  return files;
};

/**
 * Convert a file path into an express route
 * @param  {String} path
 * @param  {String} base
 * @return {String}
 */
LoadRoutes.prototype.pathToRoute = function(target, base) {

  // remove file extension and normalize slashes
  target = path.normalize(target);
  target = target.replace(path.extname(target), '');

  if (base && typeof base === 'string') {
    var segments = [], segment;

    target = target.split(path.sep);
    base   = path.normalize(base).split(path.sep);
    base   = base[base.length - 1];

    for (var i = target.length - 1; i >= 0; i--) {
      segment = target[i];
      if (segment === base) break;
      if (i === target.length - 1 && segment === 'index') continue;
      if (segment !== '') segments.push(segment);
    }

    return '/' + segments.reverse().join('/');
  }

  // without a base, use the last segment
  target = path.basename(target);
  return '/' + (target !== 'index' ? target : '');
};

function isFile(target) {
  return lstat(target).isFile();
}

function isDir(target) {
  return lstat(target).isDirectory();
}
