#!/usr/bin/env node
/**
 * Tape runner used by ``npm test``. Same as babel-tape-runner, but also
 * compiles ``.ts`` / ``.tsx`` and resolves extensionless imports to them
 * (webpack does this via resolve.extensions; Node's require does not).
 */
require('@babel/register')({
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
});
require('@babel/polyfill');

const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
    try {
        return origResolve.call(this, request, parent, isMain, options);
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND' && request.startsWith('.')) {
            return origResolve.call(this, request + '.ts', parent, isMain, options);
        }
        throw err;
    }
};

const path = require('path');
const glob = require('glob');

process.argv.slice(2).forEach(function (arg) {
    glob(arg, function (er, files) {
        if (er) throw er;
        files.forEach(function (file) {
            require(path.resolve(process.cwd(), file));
        });
    });
});
