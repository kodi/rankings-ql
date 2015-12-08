var express    = require('express');        // call express
var mysql      = require('mysql');
var chalk      = require('chalk');
var expressWinston = require('express-winston');
var winston     = require('winston');        // for transports.Console
var app        = express();                 // define our app using express
var port       = 4444;


var omega_handler = require('./app/omega_handler');




// express-winston logger makes sense BEFORE the router.
app.use(expressWinston.logger({
    transports: [
        new winston.transports.Console({
            json: false,
            colorize: true
        })
    ],
    meta: false,
    colorStatus: true
}));


app.use('/api', omega_handler);


// express-winston errorLogger makes sense AFTER the router.
app.use(expressWinston.errorLogger({
    transports: [
        new winston.transports.Console({
            json: true,
            colorize: true
        })
    ]
}));

app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: err
    });
});

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);