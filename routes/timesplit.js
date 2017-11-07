const router = require('express').Router();
var dataController;
var _io;

/**  
 * TIME SPLIT
 * 
*/

var fs = require('fs');
const mainPath = require('path').dirname(require.main.filename);
const filePaths = { results: mainPath + '/data/results.json', participants: mainPath + '/data/participants.json' }

const categories = {
        junior: ['CF', 'D', 'U19F', 'U17M', 'U17F', 'U15M', 'U15F', 'U13M', 'U13F'],
        senior: ['A', 'AF', 'B', 'BF', 'C', 'U19M']
}

router.put('/', function(req, res) {
    console.log(req.method + req.url);
    /*Sample request body: {
        "bibNumber: 10,
        "timeStamp": "2016-08-20T16:58:12.207Z",
        "stage": 1,
        "checkpoint": "B",
        "finish": false,
        "start": false,
    }*/
    
    var data = req.body;    
    var bibNumber = data.bibNumber;
    var timeStamp = data.timeStamp;
    var checkpoint = data.checkpoint;
    var stage = data.stage;
    var finish = data.finish;
    var start = data.start;
    
    var specialCases = ['DNF', 'DSQ', 'DNS'];
    var participants;
    var teams;
    
    var validateData = function(oldParticipants) {
        return new Promise(function(resolve, reject) {
            participants = oldParticipants;
            const checkpoints = ['B', 'D', 'E', 'GW', 'GE'];

            console.log('validating');        
            
            if (!data || (Object.keys(data).length > 8)) {
                //Body can't be empty or have more than 8 keys;
                reject(Error('Data format error.'));
            } else {
                //Bib Number is required
                if (!bibNumber || isNaN(bibNumber)) {
                    reject(Error('Bib number invalid or not specified.'));
                } else if (!participants[bibNumber]) {
                    reject(Error('Bib ' + bibNumber + ' is not registered'));
                } else if (!(timeStamp == null || timeStamp == 'DNF' || timeStamp == 'DNS' || timeStamp == 'DSQ' || Date.parse(timeStamp))) {
                    //Time stamp is required and must either be either valid valid ISO 8601 or a special case .
                    reject(Error('Time stamp invalid or not specified.'));
                } else if (checkpoint && !checkpoints.includes(checkpoint)) {
                    reject(Error('Invalid checkpoint id.'));
                } else if (!checkpoint && !stage) {
                    reject(Error('No checkpoint or stage specified.'));
                } else if (checkpoint && stage) {
                    reject(Error('Only either checkpoint or stage should be specified.'));
                }
                //More checks if stage is specified.
                if (stage) {
                    //Stage number must be either 1, 2 or 3
                    if ((stage < 0) || (stage > 4)) {
                        reject(Error('Invalid stage number.'));
                    }
                    //Start or finish flags required since checkpoint isn't specified'
                    if (start == undefined && finish == undefined && !specialCases.includes(timeStamp)) {
                        reject(Error('No start or finish flags included.'));
                    }
                    if (!(start || finish || specialCases.includes(timeStamp))) {
                        reject(Error('One start / finish flag must be set to true.'));
                    }
                    if (start && finish) {
                        reject(Error('Only one start / finish flag can be set to true'));
                    }
                }
            }
            resolve();
        });
    }

    var updateResults = function(oldResults) {
        return new Promise(function(resolve, reject) {
            console.log('updating');
            var results = oldResults;
            isJunior = categories.junior.includes(participants[bibNumber].category);
            
            if (checkpoint == 'GW') {
                //If is junior, then finish is true
                if (isJunior) { finish = true; }
                stage = 2;
            }

                        
            //results[bibNumber][obj1][obj2] = timeStamp;
            //_io.sockets.emit('timesplit', { 'bibNumber': bibNumber, 'results': results[bibNumber] });
            
            if (stage == 2) {
                 var bibNumbers = Object.keys(results);
                //TODO: Add option for 2 person team

                /**
                 * Algorithm to find the exact order of the team members without requiring the orignial array
                 * 
                 * Explanation:
                 * 
                 * All team member's teamamtes as assigned in the exact order they are provided.
                 * 
                 * After taking all the teammates in the first index of each team member's teammate array and putting them in a new array, 
                 * there will only be two different values in the array and one will only occur once, the other one is the first teammate and will occur
                 * more than once.
                 * 
                 * If n_0 and n_1 match then both of them are not the unique value and therefore both of them are the same value as the first index
                 * If n_0 and n_1 don't match, then one of them is the unique value, but since we don't know which one, we assume that the remanining
                 * values of the array are not unique so we take the third value.
                 * 
                 * In the first team member's teamamtes array, the remaning members of the team will be in order. They get concatenated with the
                 * first member into a clean array to complete the order.
                 */

                //Build the list of all the team members, unsorted
                var team = [bibNumber, ...participants[bibNumber].teammates];
                
                //Push all the first indexes of each team member's teamamtes
                var firstIndexes = [];
                for (var i = 0; i < team.length; i++) {
                    firstIndexes.push(participants[team[i]].teammates[0]);
                }
                //Grab a non-unique value, the first team member
                var firstTeamMate = (firstIndexes[0] == firstIndexes[1]) ? firstIndexes[0] : firstIndexes[2];
                console.log('first', firstTeamMate);
                team = [firstTeamMate, ...participants[firstTeamMate].teammates];

                /**
                 * Handle checkpoint times or assign finish times for Stage 2 and compute start times for Stage 3
                 */
                if (!finish) {
                    //Set the checkpoint split times for stage2 all teammates that crossed that checkpoint
                    for (var teamCount = 0; teamCount < team.length; teamCount++) {
                        results[team[teamCount]].checkpointSplits[checkpoint] = timeStamp;
                        _io.sockets.emit('timesplit', { 'bibNumber': team[teamCount], 'results': results[team[teamCount]] });
                    }
                } else {
                    //Calculate start times for stage 3
                    //Generate the start time for stage 3, based on finish time from stage 2
                    var computedStartTime = new Date(timeStamp);
                    computedStartTime.setSeconds(0);
                    computedStartTime.setMilliseconds(0);

                    var timeOffset;
                    if (isJunior) {
                        timeOffset = 6;
                    } else {
                        timeOffset = 11;
                    }

                    computedStartTime.setMinutes(computedStartTime.getMinutes() + timeOffset);
                

                    //Add a minute to stage 3 start time, if the time is already taken
                    for (var i = 0; i < bibNumbers.length; i++) {
                        var currTime = new Date(results[bibNumbers[i]].stage3.startTime); 
                        if (currTime.getTime() >= computedStartTime.getTime()) {
                            var currMax = currTime;
                            currMax.setMinutes(currMax.getMinutes() + 1); 
                            computedStartTime = currMax;
                        }
                    }
                    //Set the start times for the now individual team mates, 1 minute after each other.
                    for (var i = 0; i < team.length; i++) {
                        results[team[i]].stage3.startTime = computedStartTime.toISOString();
                        computedStartTime.setMinutes(computedStartTime.getMinutes() + 1);
                    }

                    //Save the matching finish time for all team mates.
                    //Overridable
                    for (var teamCount = 0; teamCount < team.length; teamCount++) {
                        results[team[teamCount]].stage2.finishTime = timeStamp;
                        _io.sockets.emit('timesplit', { 'bibNumber': team[teamCount], 'results': results[team[teamCount]] });
                    }
                }
            } else {
                if (checkpoint) {
                    results[bibNumber].checkpointSplits[checkpoint] = timeStamp;
                } else if (start) {
                    results[bibNumber]["stage" + stage].startTime = timeStamp;
                } else if (finish || specialCases.includes(timeStamp)) {
                    results[bibNumber]["stage" + stage].finishTime = timeStamp;
                }
                _io.sockets.emit('timesplit', { 'bibNumber': bibNumber, 'results': results[bibNumber] });
            }

            console.log('New timeSplit for ' + bibNumber + ': ' + JSON.stringify(data));
            resolve(results);
        });
    }

    dataController.getParticipants()
    .then(validateData)
    .then(dataController.getResults)
    .then(updateResults)
    .then(dataController.setResults)
    .then(function() {
        res.status(200).send('Updated');
    }).catch(function(error) {
        console.log(error);
        res.status(400).send(error.toString());
    });
    
});

module.exports = function(controller, io) {
    _io = io;
    dataController = controller;
    return router;
}
