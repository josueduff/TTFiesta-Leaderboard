const TimeSplitStatus = { UNSET: 'UNSET', ON_CLOUD: 'ON_CLOUD', ERROR: 'ERROR' }

var menu = document.getElementById('menu');
var timelineTable = document.getElementById('timeline-container');
var timesplitButton = document.getElementById('timesplit-button');
var rowTemplate = document.getElementById('row-template');
var stationId = localStorage.getItem('stationId');

var timeSplits = [];

if (stationId) {
    menu.value = stationId;
}

menu.onchange = function(e) {
    localStorage.clear();
    stationId = e.target.value;
    document.body.setAttribute('data-checkpoint', menu.value);
    timelineTable.innerHTML = '';
    localStorage.setItem('stationId', menu.value);
}

timesplitButton.onclick = function() { 
    new TimeSplit();
}

timesplitButton.addEventListener('touchstart', function() {
    navigator.vibrate(30);
}, false);


//Hide the split button when the virtual keyboard is active
var initialScreenSize = window.innerHeight;
var activeRow;

window.addEventListener("resize", function() {
    var keyboardActive = (window.innerHeight < initialScreenSize);
    document.body.setAttribute('data-keyboard-active', keyboardActive.toString());

    if (activeRow) {
        var bounds = activeRow.getBoundingClientRect();

        if (keyboardActive) {
            if (bounds.top < 56) {
                //row.scrollIntoView();
            } else if (bounds.bottom  - 56 > timelineTable.getBoundingClientRect().height) {
                activeRow.scrollIntoView(false);
            }
        }
    }
}, false);

function TimeSplit(timeStamp, bibNumber, status, resend) {
    var date = ((timeStamp) ? new Date(timeStamp) : new Date());
    this.timeStamp = date.toISOString();
    this.bibNumber = bibNumber || '';
    this._status;
    this.stageNumber;
    this.stationId = menu.value;
    
    this.checkpointId = this.stationId;
    
    if (!localStorage.getItem(this.timeStamp)) {
        localStorage.setItem(this.timeStamp, '{}');
    }
    
    var row = rowTemplate.content.cloneNode(true).querySelector('tr');
    var statusButton = row.querySelector('.status');    
    var timeElement = row.querySelector('.timestamp');
    var inputCell = row.querySelector('.inputs');
    var inputElement = inputCell.querySelector('input');
    var directionToggle = inputCell.querySelector('.direction-toggle');
    var deleteButton = inputCell.querySelector('.delete-button');
    
    this.row = row;

    row.setAttribute('data-status', this.status);
    inputElement.value = this.bibNumber;

    timeElement.textContent = date.getHours() + ':' + 
    ((date.getMinutes() < 10) ? ('0' + (date.getMinutes())) : date.getMinutes()) + ':' + 
    ((date.getSeconds() < 10) ? ('0' + (date.getSeconds())) : date.getSeconds()) + '.' + 
    Math.round(date.getMilliseconds() / 100);

    timelineTable.appendChild(row);

    var touchTimeout;
    
    var touchHold = function() {
        deleteButton.setAttribute('data-enabled', 'true');
        setTimeout(function() {
            deleteButton.setAttribute('data-enabled', false);
        }, 5000);
    }
    
    var sendData = () => {
        if (isNaN(inputElement.value) || inputElement.value.length > 4 || inputElement.value.length < 0) {
            row.setAttribute('data-status', this.status);
            this.status = TimeSplitStatus.ERROR;
        } else {            
            switch (this.stationId) {
                case 'B': this.stageNumber = 1; break;
                case 'D': this.stageNumber = 1; this.finish = (this.direction == 'left'); break;
                case 'E': this.stageNumber = 1; break;
                case 'G': this.stageNumber = (this.direction == 'left') ? 3 : 2;
                          this.checkpointId = (this.direction == 'left') ? 'GE' : 'GW'; 
                          break;
                case 'F': this.stageNumber = 3; this.finish = true; break;
                case 'J': this.stageNumber = 2; this.finish = true; break;
            }

            this.bibNumber = inputElement.value;

            var requestBody = {
                bibNumber: this.bibNumber,
                timeStamp: this.timeStamp
            }

            if (this.finish) {
                requestBody.finish = true;
                requestBody.stage = this.stageNumber;
            } else {
                requestBody.checkpoint = this.checkpointId;
            }
            
            //Send to server
            var xhr = new XMLHttpRequest();
            xhr.open('PUT', '/timeSplit', true);
            xhr.setRequestHeader('Content-type', 'application/json');
            xhr.onload = () => {
                if (xhr.status == "200") {
                    this.status = TimeSplitStatus.ON_CLOUD;
                } else {
                    this.status = TimeSplitStatus.ERROR;                    
                }

                var storedData = requestBody;
                storedData.status = this.status;
                storedData.direction = this.direction;                
                
                localStorage.setItem(this.timeStamp, JSON.stringify(storedData));
            }
            
            xhr.ontimeout = function() {
                this.status = TimeSplitStatus.ERROR;
            }
            
            xhr.send(JSON.stringify(requestBody));
            
        }
    };

    var startedHold = false;
    
    this.direction = 'right';
    this.finish = false;

    //Events
    statusButton.addEventListener('click', sendData, false);
    statusButton.addEventListener('touchstart', function() {
        statusButton.setAttribute('data-touch', '');
        if (navigator.vibrate) { navigator.vibrate(30); }
    }, false);
    statusButton.addEventListener('touchend', function() { statusButton.removeAttribute('data-touch'); } )
        
    directionToggle.addEventListener('touchstart', function() { navigator.vibrate(30); }, false);
    directionToggle.addEventListener('click', () => {
        this.direction = (this.direction == 'right') ? 'left' : 'right';
        directionToggle.setAttribute('data-direction', this.direction);
    });
    
    deleteButton.addEventListener('touchstart', function() { navigator.vibrate(30); }, false);
    deleteButton.addEventListener('click', () => {
        if (deleteButton.getAttribute('data-enabled') == 'true') {
            localStorage.removeItem(this.timeStamp);
            timeSplits.splice(timeSplits.indexOf(this), 1);
            timelineTable.removeChild(row);
        }
    });
    
    inputCell.addEventListener('touchstart', function() {
        if (navigator.vibrate) { navigator.vibrate(30); }
        touchTimeout = setTimeout(touchHold, 610);
        startedHold = true;
    }, false);

    inputCell.addEventListener('touchend' , function() {
        clearTimeout(touchTimeout);
        startedHold = false;
    });
    
    /**
     * Abort the touch-hold if the mouse/finger is moved, to prevent the 
     * delete button from activating during a finger-drag scroll;
     */
    inputCell.addEventListener('touchmove', function() {
        if (startedHold) {
            startedHold = false;
            clearTimeout(touchTimeout);
        }
    }, false);

    inputElement.addEventListener('focus', function() {        
        activeRow = row;
        var bounds = row.getBoundingClientRect();

        var timesplitIndex = timeSplits.findIndex((element, i, arr) => {
            return (element.timeStamp == this.timeStamp);
        });

        if (bounds.top < 56) {
            row.scrollIntoView();
        }
        if (bounds.bottom  - 56 > timelineTable.getBoundingClientRect().height) {
            row.scrollIntoView(false);
        }        
    }, false);   

    if (resend) { sendData() }
    
    this.status = status || TimeSplitStatus.UNSET;
    row.scrollIntoView(false);
    timeSplits.push(this);
}

TimeSplit.prototype = {
    get status() {
        return this._status;
    },
    set status(status) {
        this._status = status;
        this.row.setAttribute('data-status', status);
    }
}

var savedTimeSplits = Object.keys(localStorage);

for (var i = 0; i < savedTimeSplits.length; i++) {
    if (Date.parse(savedTimeSplits[i])) {
        var timeStamp = savedTimeSplits[i];
        var savedTimeSplit = JSON.parse(localStorage.getItem(timeStamp));
                
        var resend = (savedTimeSplit.status == TimeSplitStatus.ERROR); 
        new TimeSplit(timeStamp, savedTimeSplit.bibNumber, savedTimeSplit.status, resend);
    }
}