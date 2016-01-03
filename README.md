# Ericsson API Facade

For the ATT Hackathon

## API

*not the most RESTful API but don't want to change it at this point in hackathon*

```
// get all stop information
curl -X GET -H "Content-Type: application/json" 'http://159.203.212.140:3000/v1/ericsson/route'

// get info for specific stop
curl -X GET -H "Content-Type: application/json" 'http://159.203.212.140:3000/v1/ericsson/route/1646'

// set the current bus stopped at stop
curl -X POST -H "Content-Type: application/json" -d '' 'http://159.203.212.140:3000/v1/ericsson/route/stop/78'

// get vehicle information -- including which stop bus is stopped at
curl -X GET -H "Content-Type: application/json" 'http://159.203.212.140:3000/v1/ericsson/status'

// increment the rider count at a specific stop by one
curl -X POST -H "Content-Type: application/json" -d '' 'http://159.203.212.140:3000/v1/ericsson/route/3212'

// set the rider count to a specific count at a specific stop
curl -X POST -H "Content-Type: application/json" -d '{
  "count": 124
}' 'http://159.203.212.140:3000/v1/ericsson/route/1638'

// reset all rider counts to 0 -- can also set all to count riders
curl -X POST -H "Content-Type: application/json" -d '{
  "count": 0
}' 'http://159.203.212.140:3000/v1/ericsson/route'
```

