 var Utils = {};

/**
 * Converts a millisecond value to a duration.
 * Return formats: HH:MM:SS, MM:SS, SS.
 * @param {Number} miliseconds
 * @return {String}
 */    
Utils.toDuration = function(milliseconds) {
    if (!isNaN(milliseconds)) {
        //Split milliseconds into hours, minutes and seconds.
        var hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24),
            minutes = Math.floor((milliseconds / (1000 * 60)) % 60),
            seconds = Math.floor((milliseconds / 1000) % 60);

        //Format.
        //Remove the hours placeholder duration less than an hour.
        hours = (hours > 0) ? (hours + ':') : '';

        //Add a leading 0 to minutes and seconds to ensure they are always 2 digits
        minutes = (minutes < 10) ? ('0' + minutes) : minutes;
        seconds = (seconds < 10) ? ('0' + seconds) : seconds;

        //The semicolon between hours and minutes is added onto the hour string during formatting.
        return hours + minutes + ':' + seconds;
    }
}
/**
  * Creates a new rider on the leaderboard.
  * Each rider on the leaderboard is it's own instance of Rider.
  * 
  * @param {number} bibNumber
  * @param {string} category
  * @param {string} riderName
  * @param {string} clubName
  */
function Rider(bibNumber, category, riderName, clubName) {
    //Local properties
    this.category = category;
    this.bibNumber = bibNumber;                
    this.riderName = riderName;
    this.clubName = clubName;

    //Create results entry if rider doesn't have one
    if (Leaderboard.results[bibNumber] == undefined) {
        console.warn("Rider " + bibNumber + " does not have a results entry.");

        console.log('Added empty results entry for rider #' + bibNumber);
    }

    //Create a new Rider HTML element and add the child elements
    this.categoryElement = document.querySelector(".category[data-category=" + category + "]");

    this.riderElement = document.createElement("div");
    this.riderElement.className = "rider";                

    this.riderElement.innerHTML = '<span>' + bibNumber + '</span>' + '<span>' + riderName + '</span><span>' + clubName +'</span><div class="times"><time data-time="TBA"></time><time data-time="TBA"></time><time data-time="TBA"></time><time></time></div>'; 

    this.categoryElement.removeAttribute('data-disabled');
    //Add new Rider to category element
    this.categoryElement.appendChild(this.riderElement);
    
    //Get the Time elements
    //[0]: Stage1, [1]: Stage2, [2]: Stage3, [3]: Overall
    var timeElementsList = this.riderElement.getElementsByClassName("times")[0].children;
    this.timeElements = {
        'stage1': timeElementsList[0],
        'stage2': timeElementsList[1],
        'stage3': timeElementsList[2],
        'overall': timeElementsList[3]
    }
    
    this.stageTimes = {
        stage1: {
            elapsedTime: 0,
            progress: 0
        },
        stage2: {
            elapsedTime: 0,
            progress: 0
        },
        stage3: {
            elapsedTime: 0,
            progress: 0
        },
        overall: {
            elapsedTime: 0,
            progress: 0
        }
    }
    //Add this rider object to the leaderboard
    Leaderboard.riders[bibNumber] = this;

    console.log('Rider ' + riderName + ' | ' + bibNumber + ' added.');

    this.preivousProgress = {};
}

/**
  * Sets the elapsed time of the specified stage and updates the leaderboard.
  * @param {number} stageNumber
  * @param {number | string } newTime In Duration or Millisecond format.
  */
Rider.prototype.setStageTime = function(stageNumber, newTime) {
    var stage = 'stage' + stageNumber;

    this.timeElements[stage].removeAttribute("data-unset");

    this.stageTimes[stage].elapsedTime = newTime;
    if (!isNaN(newTime)) {
        this.timeElements[stage].setAttribute('data-time', Utils.toDuration(newTime));
    } else {
        this.timeElements[stage].setAttribute('data-time', newTime);
    }

    //Set the Overall Elapsed Time
    if (isNaN(this.stageTimes.stage1.elapsedTime) || isNaN(this.stageTimes.stage2.elapsedTime) ||  isNaN(this.stageTimes.stage3.elapsedTime)) {
        this.stageTimes.overall.elapsedTime = 'DNF';
        this.timeElements.overall.textContent = 'DNF';
    } else {
        this.stageTimes.overall.elapsedTime = this.stageTimes.stage1.elapsedTime + this.stageTimes.stage2.elapsedTime + this.stageTimes.stage3.elapsedTime;
        this.timeElements.overall.textContent = Utils.toDuration(this.stageTimes.overall.elapsedTime);
    }
    
}

/**
  * Updates elapsed times of the rider from current running time or saved finishing time.
  * Updates the leaderboard through Rider.SetStageTime(...)
  */
Rider.prototype.updateTimes = function(stageNumber) {
    var bibNumber = this.bibNumber;
    var stage = 'stage' + stageNumber;
    var riderStartTime = Date.parse(Leaderboard.results[bibNumber][stage].startTime);

    var elapsedTime = Date.now() - riderStartTime;
    this.setStageTime(stageNumber, elapsedTime); 
    this.setStageProgress();
}

/**
  * Sets the progress of the rider on a stage, based on timing point results from the results database.
  * Updates the progress bar on each stage time element.
  */
Rider.prototype.setStageProgress = function() {
    var bibNumber = this.bibNumber;

    for (var stageNumber = 1; stageNumber < 4; stageNumber++) {
        var stage = 'stage' + stageNumber;
        var progress;

        var checkpoints = [['B', 'D', 'E'], ['GW'], [null, null, 'GE']];
        var stageCheckpoints = checkpoints[stageNumber - 1];
        var finishTime = Leaderboard.results[bibNumber][stage].finishTime;
        var specialCases = ['DNF', 'DSQ', 'DNS'];

        if (finishTime && specialCases.indexOf(finishTime) == -1) {
            progress = 100;
        } else if (Leaderboard.results[bibNumber].checkpointSplits[stageCheckpoints[2]]) {
            progress = 75;
        } else if (Leaderboard.results[bibNumber].checkpointSplits[stageCheckpoints[1]]) {
            progress = 50;
        } else if (Leaderboard.results[bibNumber].checkpointSplits[stageCheckpoints[0]]) {
            progress = 25;
        } else {
            progress = 0;
        }
        
        if (this.stageTimes[stage].progress != progress) {
            this.timeElements[stage].style.backgroundSize = '5px ' + progress + '%';
        }

        this.stageTimes[stage].progress = progress;
    }
}



/** The leaderboard controller
 * Manages and displays updates sent from the server. 
 */
var Leaderboard = new function LeaderboardController() {
    var body = document.getElementsByTagName('body')[0];
    this.container = undefined;
    this.participants = {};
	this.results = {}
    //Object to be populated with instances of Rider
	this.riders = {};
    
    /** Initiates the leaderboard.
     * Gets the latest results either from server or locally then populates the leaderboard with riders.
     *  @param {boolean} getFromServer Get latest files from server otherwise use local data. 
     */
    this.init = function() {
        if (!this.container || !(this.container instanceof Node)) {
            console.error('No valid HTMLElement container set.');
        } else {
            this.riders = {};
            this.participants = {};
            this.results = {};
            var setParticipants = getSetJSON('/participants', this.participants);
            var setResults = getSetJSON('/results', this.results);

            Promise.all([setParticipants, setResults]).then(populateLeaderboard).then(connectToSocket).then(startTimers);
        }
    }

    this.updateParticipants = function() {
        populateLeaderboard();
    }

    function getSetJSON(fileName, object) {
        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', fileName, true);
            xhr.setRequestHeader('Content-type', 'application/json');
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4 && xhr.status == "200") {
                    console.log('Getting ' + fileName);
                    var content = JSON.parse(xhr.responseText);
                    Object.assign(object, content);
                    resolve();
                }
            }
            xhr.send();
        });
    }

    function createCategoryElements() {
        var categories = ['A','AF', 'B', 'BF', 'C', 'CF', 'D', 'U19M', 'U19F', 'U17M', 'U17F', 'U15M', 'U15F', 'U13M', 'U13F'];
        var fragment = document.createDocumentFragment();
        categories.forEach(function(category, index) {
            var categoryElement = fragment.appendChild(document.createElement('section'));
            categoryElement.setAttribute('class', 'category');
            categoryElement.setAttribute('data-category', category);
            categoryElement.setAttribute('data-disabled', '');
            categoryElement.innerHTML = '<header><span>Category ' + category + '</span><div class="times"><span>Stage 1</span><span>Stage 2</span><span>Stage 3</span><span>Overall</span></div></header>';
        });

        this.container.appendChild(fragment);
    }

    function populateLeaderboard() {
        return new Promise(function(resolve, reject) {
            //Clear the container to if it's populate
            this.container.innerHTML = '';

            //Create all the category elements
            createCategoryElements();

            var keys = Object.keys(Leaderboard.participants);
            console.log('Populating leaderboard');

            if (keys.length == 0) {
                console.warn("No riders have registered");
            } else {
                for (var i = 0; i < keys.length; i++) {
                    var participant = Leaderboard.participants[keys[i]];
                    //(bibNumber, category, riderName, clubName)
                    new Rider(keys[i], participant.category, participant.riderName, participant.clubName);
                }
                console.log('Leaderboard populated');
            }
            resolve();
        });
    }    

    function connectToSocket() {
        return new Promise(function(resolve, reject) {
            if (typeof io !== 'undefined') {
                //const serverAddress = 'http://leaderboard.bnsroad.ca:8000/';
                //const serverAddress = 'http://192.168.0.15:8080/;'
                var serverAddress = location.hostname;

                if (location.hostname.indexOf('bnsroad.ca') != -1) {
                    serverAddress = 'https://leaderboard.bnsroad.ca/';
                } else if(location.hostname == '192.168.0.15') {
                    serverAddress = 'http://192.168.0.15:8000/';
                } else {
                    serverAddress = location.hostname;
                }

                var socket = io.connect(serverAddress);
                console.log('Connecting to socket');

                socket.on('participantsupdate', function() { Leaderboard.init(); });
                socket.on('resultsupdate', function(results) { Leaderboard.results = results; });
                //}
                
                socket.on('timesplit', function(newSplit) {
                    console.log('Received time split');
                    console.log(newSplit);
                    Leaderboard.results[newSplit.bibNumber] = newSplit.results;
                });

                socket.on('end', function() {
                    console.log('disconnected');
                    socket.disconnect(0);
                });

                resolve();

            } else {
                reject('Socket.IO not found');
            }
        });
    }

    function startTimers() {
        return new Promise(function(resolve, reject) {
            var ridersPostSort = [];
            var initialSort = true;

            setInterval(() => {
                var bibNumbers = Object.keys(Leaderboard.riders);

               /**Update leaderboard with running times.**/
                for (var i = 0; i < bibNumbers.length; i++) {
                    var bibNumber = bibNumbers[i];
                    for (var stageNumber = 1; stageNumber < 4; stageNumber++) {
                        var stage = 'stage' + stageNumber;
                        var riderStartTime = Leaderboard.results[bibNumber][stage].startTime;
                        var riderFinishTime = Leaderboard.results[bibNumber][stage].finishTime;
                        var riderStageDuration;
                        
                       var specialCases = ['DNF', 'DSQ', 'DNS'];
                       
                       if (specialCases.includes(riderFinishTime)) {
                           Leaderboard.riders[bibNumber].stageTimes[stage].elapsedTime = riderFinishTime;
                           Leaderboard.riders[bibNumber].timeElements[stage].setAttribute('data-time', riderFinishTime);
                        } else if (riderStartTime && riderFinishTime) {
                            //Calculate difference between finish and start time
                            riderStageDuration = Date.parse(riderFinishTime) - Date.parse(riderStartTime);
                            //Display the new split
                            //Leaderboard.riders[bibNumber].timeElements[stage].setAttribute('data-time', riderStageDuration);
                            Leaderboard.riders[bibNumber].setStageTime(stageNumber, riderStageDuration);
                        } else if (riderStartTime && !riderFinishTime) {
                            //Check if rider has started
                            if (Date.now() > Date.parse(riderStartTime)) {
                                Leaderboard.riders[bibNumber].updateTimes(stageNumber);
                            } else {
                                //Show the rider's departure time if available
                                Leaderboard.riders[bibNumber].timeElements[stage].setAttribute('data-time', new Date(riderStartTime).toLocaleTimeString());
                            }
                        }
                        Leaderboard.riders[bibNumber].setStageProgress();
                    }
                }

                /**Sort overall times**/
                var elapsedTimes = [];
                var categories = {}

                for (var j = 0; j < bibNumbers.length; j++) {
                    var category = Leaderboard.riders[bibNumbers[j]].category;
                    if (!categories[category]) {
                        categories[category] = [];
                    } 
                    categories[category].push(Leaderboard.riders[bibNumbers[j]]);
                }

                var categoryKeys = Object.keys(categories);
                var wasSorted = false;

                
                /**
                 * Sort the riders array by overall elapsedTime;
                 */
                for (var j = 0; j < categoryKeys.length; j++) {
                    categories[categoryKeys[j]].sort(function(rider1, rider2) {
                        return rider1.stageTimes.overall.elapsedTime - rider2.stageTimes.overall.elapsedTime;
                    });
                }

                //Latest order of riders
                var ridersPreSort = [];
                for (var j = 0; j < categoryKeys.length; j++) {
                    for (var k = 0; k < categories[categoryKeys[j]].length; k++) {
                        ridersPreSort.push(categories[categoryKeys[j]][k]);
                    }
                }
                //Check if a sort was completed this iteration
                for (var j = 0; j < ridersPostSort.length; j++) {
                    if (ridersPreSort[j].bibNumber != ridersPostSort[j].bibNumber) {
                        console.log('Positions have changed');
                        wasSorted = true;
                        break;
                    }
                }
                
                //Clear the previous results and store results from this iteration, to compare with results of next iteration
                ridersPostSort = [];
                for (var j = 0; j < categoryKeys.length; j++) {
                    for (var k = 0; k < categories[categoryKeys[j]].length; k++) {
                        ridersPostSort.push(categories[categoryKeys[j]][k]);
                    }
                }
                
                /**
                 * Move the rider elements on the leaderboard to reflect the new order.
                 */
                if (wasSorted || initialSort) {
                    initialSort = false;
                    for (var j = 0; j < categoryKeys.length; j++) {
                        var ridersInCategory = categories[categoryKeys[j]];
                        //loop in reverse since the riders get pushed top-to-bottom in their category elements.
                        //Start with slowest and finish with fastest.
                        for (var riderIndex = ridersInCategory.length-1; riderIndex > -1; riderIndex--) {
                            //The first child node is the header, and at least 2 riders must exist to replace. 
                            if (ridersInCategory[riderIndex].categoryElement.childNodes.length > 2) {
                                ridersInCategory[riderIndex].categoryElement.insertBefore(ridersInCategory[riderIndex].riderElement, ridersInCategory[riderIndex].categoryElement.childNodes[1]);
                            }
                        }
                    }
                }
            }, 1000);
            resolve();
        });
    }

    this.currentPageIndex = 0;
    this.switchPages = function() {
        setInterval(() => {
            var pageCount = body.scrollWidth / body.clientWidth;
            if (++this.currentPageIndex < pageCount) {
                window.scrollTo(this.currentPageIndex * body.clientWidth, 0);
            } else {
                window.scrollTo(0,0);
                this.currentPageIndex = 0;
            }
        }, 20000);
    }
}