var timeElement = document.getElementById("container").getElementsByTagName("time")[0];
var upcomingRidersElements = document.getElementsByClassName("upcoming-rider");
            
timeElement.addEventListener('webkitAnimationEnd', function() {
    timeElement.style.webkitAnimationName = '';
}, false);

var startList;

var xhr = new XMLHttpRequest();
xhr.open('GET', '/startList?stage=1&time=' + new Date().getTime(), true);
xhr.setRequestHeader('Content-type', 'application/json');
xhr.onreadystatechange = function() {
    if (xhr.readyState == 4 && xhr.status == "200") {
        var content = JSON.parse(xhr.responseText);
        startList = content;
        console.log(startList);        

        if (startList.length > 1) {

            for (var j = 0; j < startList.length; j++) {
                if (j < upcomingRidersElements.length) {
                    upcomingRidersElements[j].firstElementChild.textContent = startList[j][0];
                    upcomingRidersElements[j].lastElementChild.textContent = startList[j][1];
                } else {
                    break;
                }
            }
            setTimeout(interval, 1000);
        } else {
            timeElement.textContent = 'End';
            upcomingRidersElements[0].parentElement.parentElement.removeChild(upcomingRidersElements[0].parentElement);
        }
    }
}
xhr.send();

var isComplete = false;

var start = new Date();
start.setSeconds(0);
start.setMilliseconds(0);
var time = 0;

var duration = 60;
var elapsed = duration;

function interval() {
    time += 1000
    elapsed = (elapsed == 0) ? duration : elapsed - 1;
    var diff = (new Date() - start) - time;
    
    if (diff < 100 && !isComplete && (new Date(startList[0][2]).getTime() < Date.now())) {
        var timeUntilStart = new Date(new Date(startList[0][2]) - Date.now());
        timeUntilStart = timeUntilStart.getMinutes() + ':' + timeUntilStart.getSeconds();

        if (startList.length == 0) {
            isComplete = true;
            return;
        }
        

        function updateList() {
            for (var j = 0; j < startList.length; j++) {
                if (j < upcomingRidersElements.length) {
                    upcomingRidersElements[j].firstElementChild.textContent = startList[j][0];
                    upcomingRidersElements[j].lastElementChild.textContent = startList[j][1];
                }

                if (startList.length < upcomingRidersElements.length) {
                    upcomingRidersElements[j].parentElement.removeChild(upcomingRidersElements[0].parentElement.lastElementChild);
                }
                                
            }
        }

        timeElement.setAttribute('data-time', elapsed);

        switch (true) {
            case elapsed == 0:  timeElement.textContent = 'GO!'; startList.shift(); break;
            case elapsed == 57: updateList(); break;
            case elapsed < 58:  timeElement.textContent = '0:' + ((elapsed < 10) ? ('0' + elapsed) : elapsed);
            case elapsed < 6:   timeElement.style.webkitAnimationName = 'blink'; navigator.vibrate(50); break;
        }

        console.log(elapsed);
    }
    
    if (!isComplete) {
        setTimeout(interval, 1000 - diff);
    } else {
        timeElement.textContent = 'End';
    }
}

