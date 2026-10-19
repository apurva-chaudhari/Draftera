/**
 * Load a module with some of its require() calls replaced by fakes, so
 * controller logic can be tested without MongoDB.
 */
const Module = require("node:module");
const path = require("node:path");

const SERVER_ROOT = path.resolve(__dirname, "..", "..");

/** `target` is relative to the server folder, e.g. "controllers/projectController". */
function loadWithStubs(target, stubs) {
  const original = Module._load;
  const file = path.join(SERVER_ROOT, target);

  Module._load = function patched(request, ...rest) {
    if (Object.hasOwn(stubs, request)) return stubs[request];
    return original.call(this, request, ...rest);
  };

  try {
    delete require.cache[require.resolve(file)];
    return require(file);
  } finally {
    Module._load = original;
  }
}

/** Minimal Express-style response that records status and JSON body. */
function fakeRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    cookie(name, value, options) { this.headers[`cookie:${name}`] = { value, options }; return this; },
    clearCookie(name, options) { this.headers[`clear:${name}`] = options; return this; },
  };
}

module.exports = { loadWithStubs, fakeRes };
