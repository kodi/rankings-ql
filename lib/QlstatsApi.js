var request = require('request');



function QlstatsApi() {

    //this.API_URL = 'http://qlstats.net:8081/api/jsons/{d}';
    this.API_URL = 'http://backup.qlstats.net:8082/api/jsons/{d}';

};


QlstatsApi.prototype.loadRemote = function (date, callback) {

    var url = this.API_URL.replace('{d}', date);

    request({url: url, gzip: true, json: true, encoding: 'utf8'},
        function (error, response, body) {
            callback(body);
        }
    );
};


module.exports = QlstatsApi;
