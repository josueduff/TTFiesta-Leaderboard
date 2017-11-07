const router = require('express').Router();

var dataController;
var _io;

/** 
 * RESULTS
 * 
*/
router.route('/')
.get(function(req, res) {
    console.log(req.method + ' ' + req.url + ' | Content-Type: ' + req.get('Content-Type'));

    if (req.get('Content-Type') == 'application/json') {
        dataController.getResults().then(function(results) {
            res.json(results);
        });
    } else {
        //Map JSON to CSV
        dataController.getResults().then(function(json) {
            const checkpoints = ['B', 'D', 'E', 'GW', 'GE'];

            var results = json;

            var bibNumbers = Object.keys(results);
            console.log('bibs', bibNumbers);
            var csvText = '';

            for (var i = 0; i < bibNumbers.length; i++) {
                var bibNumber = bibNumbers[i];
                var riderResults = results[bibNumber];
                
                var row = bibNumber + ',';
                var checkpointSplits = riderResults.checkpointSplits;

                for (var stageNumber = 1; stageNumber < 4; stageNumber++) {
                    var stageResults = riderResults['stage' + stageNumber];
                    row += stageResults.startTime + ','+ stageResults.finishTime + ',';
                }

                for (var j = 0; j < checkpoints.length; j++) {
                    row += checkpointSplits[checkpoints[j]] + ',';
                }
                
                row = row.substring(0, row.length-1);
                row += '\r\n';
                
                csvText += row;
            }

            res.writeHead(200, {'Content-Type' : 'text/csv'});
            res.end(csvText);
        });
    }
})

.post(function(req, res) {
    console.log(req.method + ' ' + req.url + ' | Content-Type: ' + req.get('Content-Type'));

    var convertData = function() {
        return new Promise(function(resolve, reject) {
            var contentType = req.get('Content-Type');
            var results = {};

            if (contentType == 'application/json') { 
                //JSON doesn't need to be converted
                results = req.body;
            } else if (contentType == 'text/csv') {
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
                    
                    if (columns.length > 12) {
                        reject('More than 12 columns supplied in row \"' + rows[i] + '\"');
                    }

                    console.log('Row: ' + columns);
                    bibNumber = columns[0];

                    for (var columnIndex = 0; columnIndex < columns.length; columnIndex++) {
                        //Replace string versions of "null" with JSON null
                        columns[columnIndex] = (columns[columnIndex] == "null") ? null : columns[columnIndex];
                    }

                    results[bibNumber] = {
                        "stage1": {
                            "startTime": columns[1],
                            "finishTime": columns[2]
                        },
                        "stage2": {
                            "startTime": columns[3],
                            "finishTime": columns[4]
                        },
                        "stage3": {
                            "startTime": columns[5],
                            "finishTime": columns[6]
                        },
                        "checkpointSplits": {"B": columns[7],"D": columns[8],"E": columns[9],"GE": columns[10],"GW": columns[11] }
                    }
                }
            }

            resolve(results);
        });
    }

    convertData()
    .then(dataController.setResults)
    .then(function(results) {
        _io.sockets.emit('resultsupdate', results);
        res.send('saved');
    })
    .catch(function(err) {
        console.log(err);
        res.status(400).send(err.toString());
    });
    
});

module.exports = function(controller, io) {
    _io = io;
    dataController = controller; 
    return router;
}