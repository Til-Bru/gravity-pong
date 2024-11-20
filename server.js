const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let players = {};
let ball = {x: 0, y: 0, vx:5, vy:3};

// Serve static files (client-side code)
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Add new player to the game
    players[socket.id] = { x: 0, y: 0 }; // Initial position

    const angleDist = 2* Math.PI / Object.keys(players).length;
    let newAngle = 0
    for (const id in players) {
        if (players.hasOwnProperty(id)) {
            players[id].angle = newAngle;
            newAngle += angleDist;
        }
    }

    socket.on('playerMove', (direction) => {
        const player = players[socket.id];
        if (!player) return;

        if (direction === 'a') {
            player.y -= 10; // Move left
        } else if (direction === 'd') {
            player.y += 10; // Move right
        }

        // Notify all players of the update
        io.emit('updatePlayers', players);
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});

// Send rectangles to all players every 160ms
setInterval(() => {

    //Update ball position
    ball.x += ball.vx;
    ball.y += ball.vy;

    //Border collision
    if ( ball.x >= 600 || ball.x <= 0 ) {
        ball.vx *= -1;
    }
    if ( ball.y >= 600|| ball.y <= 0 ) {
        ball.vy *= -1;
    }

    io.emit('ball', ball);
}, 16);

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
