const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let players = {};

// Ball object with initial properties
let ball = {
    x: 300, // Initial x position
    y: 300, // Initial y position
    vx: 0, // Initial velocity in x-direction
    vy: 0, // Initial velocity in y-direction
    mass: 1, // Mass of the ball
};
// Function to generate random forces within a given range
function generateRandomForce() {
    const fx = Math.random() * 10 - 5; // Random force between -10 and 10
    const fy = Math.random() * 10 - 5; // Random force between -10 and 10
    return { fx, fy };
}
// Force definitions for each 45-degree segment (randomized)
const forces = [
    generateRandomForce(),  // 0°–45°
    generateRandomForce(),  // 45°–90°
    generateRandomForce(),  // 90°–135°
    generateRandomForce(),  // 135°–180°
    generateRandomForce(),  // 180°–225°
    generateRandomForce(),  // 225°–270°
    generateRandomForce(),  // 270°–315°
    generateRandomForce(),  // 315°–360°
];
// Time step (in seconds)
const dt = 0.016;

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


// Function to determine the active force based on ball's position
// Function to calculate angle and determine the active force
function getForce(ball) {
    // Calculate angle (atan2 returns in radians)
    const dx = ball.x - 300; // Offset from the center
    const dy = ball.y - 300;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI); // Convert to degrees

    // Normalize angle to [0, 360)
    if (angle < 0) angle += 360;

    // Determine the segment (divide by 45°)
    const segment = Math.floor(angle / 45);

    // Return the corresponding force
    return forces[segment];
}


// Update ball every 16ms
setInterval(() => {

    //Select correct force
    let force = getForce(ball);


    // Calculate acceleration
    const ax = force.fx / ball.mass;
    const ay = force.fy / ball.mass;
    // Update velocity
    ball.vx += ax * dt;
    ball.vy += ay * dt;
    // Update position
    ball.x += ball.vx * dt + (ax * dt * dt) / 2;
    ball.y += ball.vy * dt + (ay * dt * dt) / 2;



    //Border collision
    if ( ball.x >= 600 || ball.x <= 0 ) {
        ball.vx *= -1;
    }
    if ( ball.y >= 600|| ball.y <= 0 ) {
        ball.vy *= -1;
    }



    io.emit('ball', ball);
}, dt);

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
