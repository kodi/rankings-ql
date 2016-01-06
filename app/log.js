var datetime = require('node-datetime');
var chalk = require('chalk');

var util = require('util');

exports.logRequest = function(req) {

    var dt = datetime.create(Date.now());
    var formatted = dt.format('Y-m-d H:M:S');
    var message = "[" + chalk.green(formatted) +"] ";
    message += "IP: " + chalk.red(req.ip);
    message += " (" + chalk.yellow(req.hostname) + ") ";
    message += chalk.blue(req.path);
    console.log(message);
};


exports.logErr = function(msg){

    var dt = datetime.create(Date.now());
    var formatted = dt.format('Y-m-d H:M:S');
    var message = "[" + chalk.white(formatted) + "] ";
    message += chalk.red(util.inspect(msg));
    console.log(message);

};


exports.logOk = function(msg){

    var dt = datetime.create(Date.now());
    var formatted = dt.format('Y-m-d H:M:S');
    var message = "[" + chalk.white(formatted) + "] ";
    message += chalk.green(util.inspect(msg));
    console.log(message);

};


exports.logInfo = function(msg){

    var dt = datetime.create(Date.now());
    var formatted = dt.format('Y-m-d H:M:S');
    var message = "[" + chalk.white(formatted) + "] ";
    message += chalk.blue(util.inspect(msg));
    console.log(message);

};


