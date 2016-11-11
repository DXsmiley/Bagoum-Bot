/**
 * Created by Doge on 11/10/2016.
 */

var http = require('http');

var opt = {
    host: 'www.bagoum.com',
    path: '/cardsFullJSON'
};

http.request(opt, function(resp) {
    var toRet = '';
    resp.on('data', function(chunk) {
        toRet += chunk;
    });
    resp.on('end', function() {
        console.log(toRet);
    });
}).end();