const router = require('express').Router();
var dataController;
/**
 * START LIST
 * 
*/

router.get('/', function(req, res) {
    var stageNumber = 3;

    dataController.getParticipants().then(function(participants) {
        dataController.getResults().then(function(results) {
            var bibNumbers = Object.keys(results);
            var startTimes = [];
            for (var i = 0; i < bibNumbers.length; i++) {
                var startTime = results[bibNumbers[i]]['stage' + stageNumber].startTime
                if (startTime != null && !results[bibNumbers[i]].stage3.finishTime) {
                    startTimes.push([bibNumbers[i], participants[bibNumbers[i]].riderName, startTime]);
                }
            }
            console.log('starttimes', startTimes);
            startTimes.sort(function(rider1, rider2) {
                return (new Date(rider1[2]).getTime()) - (new Date(rider2[2]).getTime());
            });

            var compiledTimes = [];
            for (var i = 0; i < startTimes.length; i++) {
                compiledTimes.push(['<p><span>' + new Date(startTimes[i][2]).toLocaleTimeString() + '</span><span>' + startTimes[i][0] + '</span><span>' + startTimes[i][1] + '</span></p>']);
            }
            compiledTimes = compiledTimes.join('');

            compiledTimes = '<!DOCTYPE html><head><meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0"> <meta name="mobile-web-app-capable" content="yes"> <meta name="theme-color" content="#448AFF"></head>' + compiledTimes;

            compiledTimes += '<style>body {margin: 0; overflow: scroll} p {white-space: nowrap; min-width: 100%; height:56px; line-height: 56px; margin: 0; background-color: #fff} p:nth-of-type(odd) {background-color:#eee} span {padding: 0 10px; font-family: sans-serif; display:inline-block} p span:first-child {width: 100px} p span:nth-child(2) { border-right: 1px solid #aaa; border-left: 1px solid #aaa; width: 30px } p span:last-child{min-width:150px}</style>'
            res.status(200).send(compiledTimes);

        });
    });

});

module.exports = function(controller) {
    dataController = controller; 
    return router;
}