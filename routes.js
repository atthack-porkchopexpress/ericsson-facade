var express = require('express');
var request = require('request');
var async = require('async');
var bodyParser = require('body-parser');
var router = express.Router();

module.exports = function(config) {
  // constants
  const apiHeader = {
    'APIKey': 'api-key-1234',
    'Authorization': 'Basic cHJvdmlkZXI6MTIzNA==',
    'Accept': 'application/json'
  };
  const vin1 = 6795063081;

  // initial middleware
  router.use(bodyParser.json());

  // always first get a new request ID for bus
  router.use(function(req, res, next) {
    req.atthack = {};

    getRequestId(function(err, status, response) {
      if (err) {
        console.error(err);
        return next(err);
      }

      req.atthack.requestId = response.requestId;
      return next();
    });
  });


  router.route('/v1/ericsson/status')
    .get(function(req, res, next) {
      request({
        url: 'http://delta.hack.att.io:3000/remoteservices/v1/vehicle/status/' + vin1 + '/' + req.atthack.requestId,
        method: 'GET',
        headers: apiHeader
      }, function(err, status, response) {
        if (err) {
          console.error(err);
          return res.status(500).json(err);
        }
        response = JSON.parse(response); // GET's don't automatically convert
        delete response.statusReport.stops;

        res.json(response);
      });
    });

  router.route('/v1/ericsson/route/stop/:stopId')
    .post(function(req, res, next) {
      request({
        url: 'http://delta.hack.att.io:5000/luigi/v1/emulate/current_bus_stop_id',
        method: 'POST',
        json: {
          "currentBusStopId": req.params.stopId
        }
      }, function(err, status, response) {
        if (err) {
          console.error(err);
          return res.status(500).json(err);
        }

        res.status(201).end();
      });
    });

  router.route('/v1/ericsson/route/:stopId?')
    .get(function(req, res, next) {
      request({
        url: 'http://delta.hack.att.io:3000/remoteservices/v1/vehicle/status/' + vin1 + '/' + req.atthack.requestId,
        method: 'GET',
        headers: apiHeader
      }, function(err, status, response) {
        if (err) {
          console.error(err);
          return res.status(500).json(err);
        }
        response = JSON.parse(response); // GET's don't automatically convert

        var set = response.statusReport.stops;

        if (req.params.stopId) {
          set = set.filter(function(stop) {
            return stop.stopId == req.params.stopId;
          })[0] || {};
        }

        res.json(set);
      });
    })
    .post(function(req, res) {
      async.series([
        function(next) {
          if (req.body.count >= 0) {
            return next(null, req.body.count);
          }

          if (!req.params.stopId) {
            res.status(400).end('must increment a specific stopId');
          }

          // else get last known count for stop and incr 1
          request({
            method: 'GET',
            url: 'http://159.203.212.140:3000/v1/ericsson/route/' + req.params.stopId
          }, function(err, status, response) {
            if (err) {
              console.error(err);
              return next(err);
            }

            // must convert...
            response = JSON.parse(response);
            next(null, response.load += 1);
          });
        }
      ], function(err, result) {
        if (err) {
          console.error(err);
          return res.status(500).json({err: err});
        }

        var incr = result[0];


        // either post count to specific bus stop or to all of them
        async.series([
          function(doneWith) {
            if (!req.params.stopId) {
              // get all stop IDs
              request({
                method: 'GET',
                url: 'http://159.203.212.140:3000/v1/ericsson/route'
              }, function(err, status, response) {
                if (err) {
                  console.error(err);
                  return doneWith(err);
                }

                // must convert...
                response = JSON.parse(response);

                var stops = response.map(function(stop) {
                  return stop.stopId;
                });

                return doneWith(null, stops);
              });
              return;
            }

            doneWith(null, [req.params.stopId]);
          }
        ], function(err, result) {
          async.each(result[0], function(stopId, done) {
            // noop stats collection
            sendStats({
              "stopId": stopId,
              "count": incr
            }, function() {});

            request({
              url: 'http://delta.hack.att.io:5000/luigi/v1/emulate/bus_stop_load',
              method: 'POST',
              json: {
                "busStopId": stopId,
                "busStopLoad": incr
              }
            }, function(err, status, response) {
              if (err) {
                console.error(err);
                return done(err);
              }

              done(null);
            });
          }, function(err) {
            if (err) {
              return res.status(500).json(err);
            }

            res.status(201).end();
          });
        });
      });
    });


  function getRequestId(callback) {
    request({
      method: 'POST',
      url: 'http://delta.hack.att.io:3000/remoteservices/v1/vehicle/bus_info/view/' + vin1,
      headers: apiHeader,
      json: {
        // "longitude": 55.578545,
        // "latitude": 14.254875,
        // "accuracy": 6
      }
    }, callback);
  }

  function sendStats(json, callback) {
    async.parallel([
      function(done) {
        request({
          url: 'https://run-west.att.io/670aa186dc462/1ac4fc71faf6/ca20c0fca6e536a/in/flow/busstop/data',
          method: 'POST',
          json: json
        }, function(err, status, response) {
          console.log('======= M2X =======', err, status && status.statusCode, response);
          done(err, response);
        });
      },

      function(done) {
        request({
          // url: 'http://api-m2x.att.com/v2/devices/4680e338f670a00bbd10a150fd885cbc/streams/Request',
          url: 'http://api-m2x.att.com/v2/devices/4680e338f670a00bbd10a150fd885cbc/streams/Request/value',
          method: 'PUT',
          json: { "value": Date.now() },
          // json: { "display_name": "Request", "unit": { "label": "stop" } },
          // json: { values: { stop: [ {timestamp: 'iso', value: 43} ] } },
          headers: {
            'X-M2X-KEY': '1418a06547094a20c294304069b73dc9'
          }
        }, function(err, status, response) {
          console.log('======= M2X -Skip =======', err, status && status.statusCode, response);
          done(err, response);
        });
      }
    ], function(err, result) {
      if (err) {
        console.error(err);
        return callback(err);
      }

      callback(null, result);
    });
  }

  return router;
};
