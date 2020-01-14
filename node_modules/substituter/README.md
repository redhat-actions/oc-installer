# substituter
[![Travis Build](https://travis-ci.org/Nordstrom/substituter.svg)](https://travis-ci.org/Nordstrom/substituter) [![Coverage Status](https://coveralls.io/repos/github/Nordstrom/substituter/badge.svg?branch=master)](https://coveralls.io/github/Nordstrom/substituter?branch=master) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [![substituter](https://img.shields.io/npm/v/substituter.svg)](https://www.npmjs.com/package/substituter)

Simple substitution for Node.js

## Installation
Install via npm as follows:
```
$ npm install substituter --save
```

## Usage
Substitute any object property into a template string.
```javascript
var sub = require('substituter'),
    fs = require('fs');

var results = sub('Hello ${globe.region}!', { globe: { region: 'world' } });
// Hello world!

results = sub(fs.readFileSync('template.xml'), { val1: 'foo' });
// Does substitution in a Buffer.  results is a string.
```

Substitute any object property into another object.
```javascript
var sub = require('substituter');

var results = sub({ board: { message: 'Hello ${globe.region}!' }}, { globe: { region: 'world' } });
// { board: { message: 'Hello ${globe.region}!' } }
```
