//HTTPサーバクライアント機能を提供
var http = require('http');

//ファイルシステムとファイルシステムパスの機能を提供
var fs = require('fs');
var path = require('path');

//アドオンのmimeモジュール
//ファイル拡張子に基づいてMIMEタイプを取得するために使用
var mime = require('mime');

//cacheオブフェクトにはファイルの内容が格納される
var cache = {};

//ファイルデータとエラー応答の送信
function send404(response) {
    response.writeHead(404,{'Content-Type': 'text/plain'});
    response.write('Error 404: resource not found');
    response.end();
}

function sendFile(response, filePath, fileContents) {
    response.writeHead(
        200,
        {"content-type": mime.getType(path.basename(filePath))}
    );
    response.end(fileContents);
}

function serveStatic(response,absPath) {
    //キャッシュにファイルが存在するか確認
    if (cache[absPath]) {
        //キャッシュに存在する場合は、キャッシュからファイルを送信
        sendFile(response, absPath, cache[absPath]);
    } else {
        //キャッシュに存在しない場合は、ファイルシステムから読み込む
        fs.exists(absPath, function(exists) {
            if (exists) {
                //ファイルが存在する場合は、読み込み
                fs.readFile(absPath, function(err, data) {
                    if (err) {
                        send404(response);
                    } else {
                        //読み込んだデータをキャッシュに保存し、送信
                        cache[absPath] = data;
                        sendFile(response, absPath, data);
                    }
                });
            } else {
                //ファイルが存在しない場合は404エラーを送信
                send404(response);
            }
        });
    }
}

//HTTPサーバを作成
var server = http.createServer(function(request, response) {
    //リクエストのURLからファイルパスを取得
    var filePath = false;
    if (request.url == '/') {
        filePath = 'public/index.html';
    } else {
        filePath = 'public' + request.url;
    }
    //絶対パスを取得
    var absPath = './' + filePath;
    //静的ファイルを提供
    serveStatic(response, absPath);
});

server.listen(3000, function() {
    console.log("Server listening on port 3000.");
});

var chatServer = require('./lib/chat_server');
//チャットサーバを起動
chatServer.listen(server);