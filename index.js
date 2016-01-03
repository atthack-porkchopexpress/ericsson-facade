var express = require('express');
var winston = require('winston');
var expressWinston = require('express-winston');
var cors = require('cors');
var util = require('util');
var app = express();

app.use(expressWinston.logger({
  transports: [
    new winston.transports.Console({
      json: true,
      colorize: true
    })
  ],
  meta: true,
  expressFormat: true,
  colorStatus: true
}));

app.use(cors());

var routes = require('./routes')();
app.use(routes);

var server = app.listen(3000, function() {
  console.log(
    util.format('Express for %s is running at http://%s:%s',
      'att hack ericsson api', server.address().address, server.address().port)
  );
});

// expose for unit tests
module.exports = app;
