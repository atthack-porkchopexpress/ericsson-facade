module.exports = function(config) {
  var express = require('express');
  var request = require('request');
  var async = require('async');
  var bodyParser = require('body-parser');
  var router = express.Router();


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

        if (req.params.stopId) {
          response = response.statusReport.stops.filter(function(stop) {
            return stop.stopId == req.params.stopId;
          })[0] || {};
        }

        res.json(response);
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

        console.log('====asdf=asdf=asdf=asdf', incr);

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

                var stops = response.statusReport.stops.map(function(stop) {
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
console.log('888888888888888888', stopId);
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

console.log('-asdf-asdf-asdf-', response);
              done(null);
            });
          }, function(err) {
console.log('-asdfuu77sadf7asdf77asdf', err);
            if (err) {
              return res.status(500).json(err);
            }

            res.status(201).end();
          });
        });
      });
    });




  /*
   * to get bus status
   * GET http://delta.hack.att.io:3000/remoteservices/v1/vehicle/status/6795063081/5768825325
   *
   *
   * to update the number of people at a bus stop
   *
  
curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{
  "busStopId": "1662",
    "busStopLoad": 25
    }' 'http://delta.hack.att.io:5000/luigi/v1/emulate/bus_stop_load'

   *
   */

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

  return router;
};
