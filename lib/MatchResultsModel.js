var request = require('request');

/*

Usage
----------------------------------------------------------
 var MatchResultModel = require('../lib/MatchResultsModel');
 var model = new MatchResultModel();

 model.loadRemote('2015-12-10', '711d1c19-b59d-4291-a9c9-4ce196dbfacf', function(gameData){
    console.log(gameData);
 });
 ----------------------------------------------------------

 */


function MatchResultsModel(gameId) {

    this._gameId = gameId;
    this.API_URL = 'http://qlstats.net:8081/api/jsons/{d}/{j}.json';
    this._data = null;
}


MatchResultsModel.prototype.loadRemote = function (date, gameId, callback) {

    var url = this.API_URL.replace('{d}', date).replace('{j}', gameId);
    var self = this;

    request({url: url, gzip: true, json: true, encoding: 'utf8'},
        function (error, response, body) {

            console.log(body.serverIp);
            self._data = body;

            callback(body);

        }
    );
};


module.exports = MatchResultsModel;

