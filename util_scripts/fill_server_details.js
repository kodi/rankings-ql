var glob                = require("glob");
var _                   = require("lodash");
var fs                  = require("fs");
var Q                   = require('q');
var chalk               = require('chalk');
var mysql               = require('mysql');

//----------------------------------------------------------
var MatchResultsModel   = require('../lib/MatchResultsModel');
var Config              = require('../config/config');
var connection          = mysql.createConnection(Config.db);

//----------------------------------------------------------

//step 1, read all files
glob("data/*.json", function (er, files) {

    var readPromises = [];

    _.each(files, function(file) {

        var deferred = Q.defer();

        fs.readFile(file, function (err, data) {
            var gameModel = JSON.parse(data);
            parseGame(gameModel, deferred);
        });

        readPromises.push(deferred.promise);

    });

    readAllFiles(readPromises);

});


function parseGame(gameModel, deferred) {
    var model = new MatchResultsModel();

    model.loadJSON(gameModel);

    var host = model.getServerIp();
    var port = model.getServerPort();
    var guid = model.getGuid();

    connection.query("SELECT * FROM `servers` WHERE `server_ip`=? AND `server_port` = ? ", [host, port], function (err, data) {

        if (data.length > 0){
            connection.query("UPDATE `matches` SET `server_id` = ? WHERE `game_id`=?", [data[0].id, guid ], function(err, updateData){
                console.log(chalk.yellow(host) + ':' + chalk.red(port) + ' ' + chalk.white(guid) + ' : ' + chalk.blue(data[0].id) );
                deferred.resolve();
            });

        }  else  {
            deferred.resolve();
        }
    });
}

//step 2, stuff to do when reading
function readAllFiles(promises) {

    Q.allSettled(promises).then(function (data) {

        console.log('closing connection');
        connection.end();
    });

}

