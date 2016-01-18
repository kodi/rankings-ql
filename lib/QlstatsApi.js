var request = require('request');
var Q = require('q');
var _ = require('lodash');
var LOG = require('../app/log');
var moment = require('moment-timezone');



function QlstatsApi() {

    this.SERVER_IDS = [169, 168, 227, 228];

    //this.API_URL = 'http://qlstats.net:8081/api/jsons/{d}';
    this.API_URL = 'http://api.qlstats.net/api/jsons?date={d}&server={s}';

}

QlstatsApi.prototype.getAllData = function(date, callback) {
    var out = {};
    out.files = [];
    var self = this;

    var processes = [];
    _.each(this.SERVER_IDS, function(sid){
        processes.push(self.loadRemote(date, sid));
    });


    Q.allSettled(processes)
        .then(function(results){
            _.each(results, function(result){
                _.each(result.value, function(game){
                    var dParts = game.end.split('T');
                    console.log('BBB');
                    var fixedDate = moment(game.end).add(1, 'hour');

                    var fd = fixedDate.tz('Europe/Berlin').format('YYYY-MM-DD');
                    console.log('format:', fixedDate.tz('Europe/Berlin').format('YYYY-MM-DD  HH:mm:ss'), 'input: ' + game.end);
                    if(fd === date) {
                        out.files.push(game.id);
                    } else {
                        LOG.logInfo('Skipping date '+ fd + ' game id: ' + game.id);
                    }
                });
            });

            callback(out);
        });


};


QlstatsApi.prototype.loadRemote = function (date, serverId, callback) {

    var url = this.API_URL.replace('{d}', date);
    url = url.replace('{s}', serverId);

    var df = Q.defer();
    request({url: url, gzip: true, json: true, encoding: 'utf8'},
        function (error, response, body) {
            df.resolve(body);
        }
    );

    return df.promise;
};


module.exports = QlstatsApi;

