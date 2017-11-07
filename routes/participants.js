const router = require('express').Router();
var dataController;

/**
 * PARTICIPANTS
 *
*/
router.route('/')
.get(function(req, res) {
    console.log(req.method + req.url);

    if (req.get('Content-Type') == 'application/json') {
        dataController.getParticipants().then(
            function(participants) {
                res.json(participants);
            })
    } else if (req.get('Content-Type') == 'text/csv') {
        dataController.getParticipants(function(json) {
            var participants = json;
            if (err) {
                console.error(err);
                res.status(400).send(err);
            }

            var participantKeys = Object.keys(participants);

            var csvContent = 'Bib Number, Category, Rider Name, Club Name\n';
            for (var i = 0; i < participantKeys.length; i++) {
                var bibNumber = participantKeys[i];
                var participant = participants[bibNumber];
                
                var row = '';
                row += bibNumber + ',' + participant.riderName + ',' + participant.clubName + ',' + participant.category + '\n';
                csvContent += row;
            }
            res.send(csvContent);
        });
    }
})
.post(function(req, res) {
    const categories = {
        junior: ['CF', 'D', 'U19F', 'U17M', 'U17F', 'U15M', 'U15F', 'U13M', 'U13F'],
        senior: ['A', 'AF', 'B', 'BF', 'C', 'U19M'] 
    }
    /* Sample request:
      "1": {
          "category": "A",
          "riderName": "Tyler Medaglia",
          "clubName": "Bike Monkey",
          "teamId": null
        },
    */
    console.log(req.method + req.url + req.get('Content-Type'));

    var participants = {};
    var bibNumbers = [];
    
    var convertData = function() {
        return new Promise(function(resolve, reject) {
            if (req.get('Content-Type') == 'text/csv') {
                var content = req.body;
                console.log('Content: ' + content);
                content = content.replace(/\r/g, '');

                //Split all the lines into an array at the line feed;
                var rows = content.split('\n');

                //Check if first row has any number which could represent a bib number.
                //Remove the first row if no numbers are found.
                if (!RegExp(/\d/).exec(rows[0])) {
                    rows.shift();
                }

                for (var i = 0; i < rows.length; i++) {
                    rows[i] = rows[i].split(',');
                    var columns = rows[i];
                    
                    if (columns.length != 4) {
                        reject('Invalid row \"' + rows[i] + '\"');
                    }
                    var bibNumber = columns[0];
                    bibNumbers.push(bibNumber);

                    participants[bibNumber] = {
                        "riderName": columns[1],
                        "clubName": columns[2],
                        "category": columns[3],
                        "teammates": [],
                    }
                }
            } else if (req.get('Content-Type') == 'application/json') {
                participants = req.body;
                bibNumbers = Object.keys(participants);
            }
            resolve();
        })
    }
    
    var validateData = function() {
        return new Promise(function(resolve, reject) {
            if (bibNumbers.length == 0) {
                reject('No bib numbers');
            }
            
            for (var i = 0; i < bibNumbers.length; i++) {
                var bibNumber = bibNumbers[i];            
                var participant = participants[bibNumbers[i]];

                if (isNaN(bibNumber)) {
                    reject('\"' + bibNumbers[i] + '\" is not a valid number');
                }
                if (Object.keys(participant).length > 4) {
                    reject('Bib ' + bibNumber + ' has to many objects');
                }
                if (!participant.category) {
                    reject('Bib ' + bibNumber + ' missing a category name');
                }
                if (!participant.riderName) {
                    reject('Bib ' + bibNumber + ' missing a rider name');
                }
                if (!participant.clubName) {
                    reject('Bib ' + bibNumber + ' missing a team name');
                }
                if ((categories.senior.indexOf(participant.category) == -1) && (categories.junior.indexOf(participant.category) == -1)) {
                    reject('Invalid category name for bib ' + bibNumber);
                }
            }
            resolve();
        });
    }
    
    var saveData = function() {
        return new Promise(function(resolve, reject) {
            var results = {};
            for (var i = 0; i < bibNumbers.length; i++) {
                var bibNumber = bibNumbers[i];
                var participant = participants[bibNumbers[i]];

                results[bibNumber] = {
                    "stage1": {
                        "startTime": null,
                        "finishTime": null
                    },
                    "stage2": {
                        "startTime": null,
                        "finishTime": null
                    },
                    "stage3": {
                        "startTime": null,
                        "finishTime": null
                    },
                    "checkpointSplits": {"B": null,"D": null,"E": null,"GE": null, "GW": null  } 
                }
            }

            Promise.all([
                dataController.setResults(results),
                dataController.setParticipants(participants)
            ]).then(function() { resolve(); })
            .catch(function(err) {
                reject(err.toString());
            });
        });
    }

    convertData()
    .then(validateData)
    .then(saveData)
    .then(function(participants) {
        _io.sockets.emit('participantsupdate', participants);
        res.send('Participants succesfully updated');
    })
    .catch(function(err) {
        res.status(400).send(err.toString());
    });

});

module.exports = function(controller, io) {
    _io = io;
    dataController = controller;
    return router;
}
