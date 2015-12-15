function loopArr(arr, callback, time, infinite) {
    console.log('loop run');

    if (typeof infinite !== "undefined") {
        infinite = false;
    }
    var i = 0,
        total = arr.length - 1;
    var loop = function () {
        // RUN CODE
        //console.log('loop arr[' + i + ']');
        callback.iter(arr[i], i);
        if (i < total) {
            i++;
        } else { // LOOP END
            //console.log('loop end!');
            if (!infinite) {
                callback.end();
                return;
            }
            i = 0; //restart
        }
        setTimeout(loop, time);
    };
    loop()
}


module.exports = loopArr;