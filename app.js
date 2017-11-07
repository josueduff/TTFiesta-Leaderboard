var express = require('express');
var bodyParser = require('body-parser');
var compression = require('compression');
var url = require('url');
var socketIO = require('socket.io');
var dataController = require('./dataController');

var app = express();
var server = (process.env.NODE_ENV == 'production') ? app.listen(process.env.PORT) :  app.listen(8000, '192.168.0.11');
var io = socketIO(server);

console.log('Server is listening');

//Disable the "x-powered-by: express" header
app.disable('x-powered-by');

app.use(compression(5));
app.use(bodyParser.json());
app.use(bodyParser.text({type: 'text/csv'}));

app.use('/public_html', express.static('public_html'));

app.use('/participants', require('./routes/participants')(dataController, io));
app.use('/teams', require('./routes/teams')(dataController));
app.use('/results', require('./routes/results')(dataController, io));
app.use('/startList', require('./routes/startlist')(dataController));
app.use('/timeSplit', require('./routes/timesplit')(dataController, io));

/* Static Files - Leaderboard, Timing Point, Countdown */
app.get('/', function(req, res) { res.sendFile(__dirname + '/public_html/leaderboard.html');});
app.get('/app', function(req, res) { res.sendFile(__dirname + '/public_html/timing_point.html'); });
app.get('/countdown', function(req, res) { res.sendFile(__dirname + '/public_html/countdown.html'); });
