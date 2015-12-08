var datetime = require('node-datetime');
var chalk = require('chalk');

exports.logRequest = function(req) {

    var dt = datetime.create(Date.now());
    var formatted = dt.format('Y-d-m H:M:S');
    var message = "[" + chalk.green(formatted) +"] ";
    message += "IP: " + chalk.red(req.ip);
    message += " (" + chalk.yellow(req.hostname) + ") ";
    message += chalk.blue(req.path);
    console.log(message);
};