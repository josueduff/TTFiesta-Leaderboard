const router = require('express').Router();
var dataController;
/**
 * TEAMS
 * 
*/

router.post('/', function(req, res) {
    console.log(req.method + req.url + req.get('Content-Type'));
    var convertData = function(data) {
        return new Promise(function(resolve, reject) {
            var participants = data;
            var bibNumbers = Object.keys(participants);
            //Ensure the teams are erased before re-setting;
            for (var i = 0; i < bibNumbers.length; i++) {
                console.log('participant', bibNumbers[i]);
                participants[bibNumbers[i]].teammates = [];
            }

            var content = req.body;
            console.log('Content: ' + content);
            content = content.replace(/\r/g, '');

            //Split all the lines into an array at the line feed;
            var rows = content.split('\n');
            var teams = [];
            

            for (var i = 0; i < rows.length; i++) {
                rows[i] = rows[i].split(',');
                var columns = rows[i];

                for (var j = 0; j < columns.length; j++) {
                    var indices = [];
                    //Remove active index from columns to assign
                    for (var index = 0; index < columns.length; index++) {
                        if (index != j) {
                            indices.push(index);
                        }
                    }

                    //Push all the other columns.
                    for (var k = 0; k < indices.length; k++) {
                        console.log('participants', participants[columns[j]]);
                        participants[columns[j]].teammates.push(parseInt(columns[indices[k]]));
                    }
                }

                teams.push([]);
                for (var j = 0; j < columns.length; j++) {
                    teams[i].push(parseInt(columns[j]));
                } 
            }
            console.log('Teams set');
            
            resolve(participants);
        });
    }
    

    dataController.getParticipants()
    .then(convertData)
    .then(dataController.setParticipants)
    .then(function() {
        res.send('Posted Teams');
    }).catch(function(err) {
        res.status(400).send(err.toString());
    });
});

module.exports = function(controller, io) {
    dataController = controller; 
    return router;
}