function divEscapedContentElement(message) {
    return $('<div></div>').text(message);
}

function divSystemContentElement(message) {
    return $('<div></div>').html('<i>' + message + '</i>');
}

//ユーザ入力の処理
function processUserInput(chatApp, socket) {
    var message = $('#send-message').val();
    var systemMassage;

    //スラッシュで始まるメッセージはコマンドとみなす
    if (message.charAt(0) == '/') {
        systemMessage = chatApp.processCommand(message);
        if (systemMessage) {
            $('#messages').append(divSystemContentElement(systemMessage));
        }
    } else {
        chatApp.sendMessage($('#room').text(), message);

        $('#messages').append(divEscapedContentElement(message));
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }

    $('#send-message').val('')
}

var socket = io.connect();

$(document).ready(function() {
    var chatApp = new Chat(socket);

    //ルームの変更
    socket.on('nameResult', function(result) {
        var message;
        if (result.success) {
            message = 'You are now known as ' + result.name + '.';
        } else {
            message = result.message;
        }
        $('#messages').append(divSystemContentElement(message));
    });

    socket.on('joinResult', function(result) {
        $('#room').text(result.room);
        $('#messages').append(divSystemContentElement('Room changed.'));
    });

    socket.on('message', function(message) {
        var newElement = $('<div></div>').text(message.text);
        $('#messages').append(newElement);
    });

    socket.on('rooms', function(rooms) {
        $('#room-list').empty();
        for (var room in rooms) {
            room = room.substring(1, room.length);
            if (room != '') {
                $('#room-list').append(divEscapedContentElement(room));
            }
        }

        //ルームをクリックしたときの処理
        $('#room-list div').click(function() {
            chatApp.changeRoom($(this).text());
        });
    });

    setInterval(function() {
        socket.emit('rooms');
    }, 1000);

    $('#send-message').focus();
    $('#send-message').submit(function() {
        processUserInput(chatApp, socket);
        return false; //フォームの送信を防ぐ
    });
});