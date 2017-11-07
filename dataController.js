var fs = require('fs');
const mainPath = require('path').dirname(require.main.filename);
const filePaths = { results: mainPath + '/data/results.json', participants: mainPath + '/data/participants.json', teams: mainPath + '/data/teams.json' }

module.exports = {
    getParticipants: function() {
        return new Promise(function(resolve, reject) {
            fs.readFile(filePaths.participants, 'utf8', function(err, data) {
                if (err) reject(err);
                resolve(JSON.parse(data));
            });
        })
    },

    setParticipants: function(participants) {
        return new Promise(function(resolve, reject) {
            fs.writeFile(filePaths.participants, JSON.stringify(participants), function(err) {
                if (err) reject(err);
                resolve(participants);
            });
        })
    },

    getResults: function() {
        return new Promise(function(resolve, reject) {
            fs.readFile(filePaths.results, 'utf8', function(err, data) {
                if (err) throw err;
                resolve(JSON.parse(data));
            });
        });
    },

    setResults: function(results) {
        return new Promise(function(resolve, reject) {
            if (!results) {
                reject('No results included');
            } else {
                fs.writeFile(filePaths.results, JSON.stringify(results), function(err) {
                    if (err) throw err;
                    resolve(results);
                });
            }
        });
    }
}