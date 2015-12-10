var MatchResultModel = require('../lib/MatchResultsModel');

var model = new MatchResultModel();

model.loadRemote('2015-12-10', '711d1c19-b59d-4291-a9c9-4ce196dbfacf', function(gameData){
    console.log(gameData);

});
