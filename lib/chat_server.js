const { Server } = require('socket.io');
let io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {
    // 新しい方法でSocket.IOサーバーを初期化します
    io = new Server(server);

    io.sockets.on('connection', function(socket) {
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
        joinRoom(socket, 'Lobby');

        handleMessageBroadcasting(socket);
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);

        socket.on('rooms', async () => {
            const rooms = Array.from(io.sockets.adapter.rooms.keys());
            socket.emit('rooms', rooms);
        });

        handleClientDisconnection(socket, nickNames, namesUsed);
    });
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    const name = 'Guest' + guestNumber;
    nickNames[socket.id] = name;
    socket.emit('nameResult', {
        success: true,
        name: name
    });
    namesUsed.push(name);
    return guestNumber + 1;
}

async function joinRoom(socket, room) {
    socket.join(room);
    currentRoom[socket.id] = room;

    socket.emit('joinResult', { room: room });

    socket.broadcast.to(room).emit('message', {
        text: nickNames[socket.id] + ' has joined ' + room + '.'
    });

    // 非同期でルームのユーザー一覧を取得します
    const socketsInRoom = await io.in(room).fetchSockets();
    if (socketsInRoom.length > 1) {
        let usersInRoomSummary = 'Users currently in ' + room + ': ';
        const otherUsers = socketsInRoom
            .filter(userSocket => userSocket.id !== socket.id)
            .map(userSocket => nickNames[userSocket.id]);

        usersInRoomSummary += otherUsers.join(', ') + '.';
        socket.emit('message', { text: usersInRoomSummary });
    }
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    socket.on('nameAttempt', (name) => {
        if (name.startsWith('Guest')) {
            socket.emit('nameResult', {
                success: false,
                message: 'Names cannot begin with "Guest".'
            });
        } else {
            if (namesUsed.indexOf(name) === -1) {
                const previousName = nickNames[socket.id];
                const previousNameIndex = namesUsed.indexOf(previousName);
                
                namesUsed.push(name);
                nickNames[socket.id] = name;
                
                // 以前の名前を正しく削除します
                if (previousNameIndex !== -1) {
                    namesUsed.splice(previousNameIndex, 1);
                }
                
                socket.emit('nameResult', { success: true, name: name });
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text: previousName + ' is now known as ' + name + '.'
                });
            } else {
                socket.emit('nameResult', {
                    success: false,
                    message: 'That name is already in use.'
                });
            }
        }
    });
}

function handleMessageBroadcasting(socket) {
    socket.on('message', (message) => {
        socket.broadcast.to(message.room).emit('message', {
            text: nickNames[socket.id] + ': ' + message.text
        });
    });
}

function handleRoomJoining(socket) {
    socket.on('join', (room) => {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.room); // room.newRoom ではなく room.room
    });
}

function handleClientDisconnection(socket) {
    socket.on('disconnect', () => {
        const nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        if (nameIndex !== -1) {
            namesUsed.splice(nameIndex, 1); // deleteではなくspliceを使用
        }
        delete nickNames[socket.id];
    });
}