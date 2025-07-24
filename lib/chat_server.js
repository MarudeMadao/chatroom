var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {
    io = socketio.listen(server);//socket.ioを起動

    // io.set('log level', 1); //ログレベルを1に設定

    io.sockets.on('connection', function(socket) {
        //新しいユーザが接続したときの処理

        //ゲスト名の割当
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
        //Lobbyにいれる
        joinRoom(socket, 'Lobby');

        //ユーザのメッセージ、名前、ルーム変更を処理
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleMessageBroadcasting(socket, nickNames);
        handleRoomJoining(socket);

        //ルームリストの要求を処理
        socket.on('rooms', function() {
            socket.emit('rooms', io.sockets.adapter.rooms);
        });

        //ユーザが切断したときの処理
        handleClientDisconnection(socket, nickNames, namesUsed);
    });
}

//ゲスト名の割り当て関数
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    var name = 'Guest' + guestNumber;
    nickNames[socket.id] = name;
    socket.emit('nameResult', {
        success: true,
        name: name
    });
    namesUsed.push(name);
    return guestNumber + 1;
}

//ルームに参加する関数
function joinRoom(socket, room) {
    //ルームに参加
    socket.join(room);

    currentRoom[socket.id] = room;

    //ルームに参加したことを通知
    socket.emit('joinResult', {room: room});
    //ルームに参加したことを全員に通知
    socket.broadcast.to(room).emit('message', {
        text: nickNames[socket.id] + ' has joined ' + room + '.'
    });

    var usersInRoom = io.in(room).fetchSockets();

    //他のユーザがいたらその概要を作る
    if(usersInRoom.length > 1) {
        var usersInRoomSummary = 'Users currently in ' + room + ': ';
        for(var index in usersInRoom) {
            var usersSocketId = UsersInRoom[index].id;
            if(usersSocketId != socket.id) {
                if(index > 0) {
                    usersInRoomSummary += ', ';
                }
                usersInRoomSummary += nickNames[usersSocketId];
            }
        }
        usersInRoomSummary += '.';
        socket.emit('message', {text: usersInRoomSummary});
    }
}

//名前変更する関数
function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    socket.on('nameAttempt', function(name) {
        // Guestで始まる名前は拒否
        if(name.indexOf('Guest') == 0) {
            socket.emit('nameResult', {
                success: false,
                message: 'Names cannot begin with "Guest".'
            });
        } else {
            //もし使用されていない名前ならば
            if(namesUsed.indexOf(name) == -1) {
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex];//以前の名前を削除

                socket.emit('nameResult', {
                    success: true,
                    name: name
                });
            } else {
                //使用されている名前ならば
                socket.emit('nameResult', {
                    success: false,
                    message: 'That name is already in use.'
                });
            }
        }
    })
}

//チャットメッセージ送信関数
function handleMessageBroadcasting(socket) {
    socket.on('message', function(message) {
        socket.broadcast.to(message.room).emit('message', {
            text: nickNames[socket.id] + ': ' + message.text
        });
    });
}

//ルーム作成関数
function handleRoomJoining(socket) {
    socket.on('join', function(room) {
        //ルームに参加
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}

//ユーザが切断したときの処理
function handleClientDisconnection(socket) {
    socket.on('disconnect', function() {
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    });
}