const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

let arena = { radius : 140, pLong: 50, pThin: 3 };
let players = {};
const playerSpeed = 20;

const canvasHeight = 300;
const halfCanvasHeight = 150;
const canvasWidth = 300;
const halfCanvasWidth = 150;

let ball = {
    x: 0,
    y: 0,
    angle: 0,
    heading: Math.PI / 5,
    score: 0,
};
const bradius = 4;
let bspeed = 0.25;

app.use(express.static('public'));

const arrangePlayers = () => {
    const playerIds = Object.keys(players);
    const totalPlayers = playerIds.length;
    const angleStep = (2 * Math.PI) / totalPlayers;

    playerIds.forEach((playerId, index) => {
        arena[playerId].angle = angleStep * index;
    });

    arena.radius = totalPlayers == 3 ? 100 : 110;
    arena.pLong = totalPlayers > 5 ? 50 - 5*(totalPlayers-5) : 50;
};

wss.on('connection', (ws) => {
    const playerId = Date.now(); // Use timestamp as a unique ID
    console.log('A player connected:', playerId);
    ws.send(JSON.stringify({ type: 'yourId', id: playerId }));

    arena[playerId] = { angle: 0 };
    players[playerId] = { pos: 0, offset: 0 };
    arrangePlayers();

    broadcast({ type: 'updateArena', updatedArena: arena });
    broadcast({ type: 'updatePlayers', updatedPlayers: players });

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'move') {
            players[playerId].offset = data.offset
            broadcast({ type: 'updatePlayers', updatedPlayers: players });
        }
    });

    ws.on('close', () => {
        console.log('Player disconnected:', playerId);
        delete players[playerId];
        arrangePlayers();
        broadcast({ type: 'updateArena', updatedArena: arena });
        broadcast({ type: 'updatePlayers', updatedPlayers: players });
    });
});

const broadcast = (data) => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

// GAME LOOP
let lastTime = Date.now();
let accumulator = 0;
const dt = 16 / 1000;
setInterval(() => {
    const currentTime = Date.now();
    const frameTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    accumulator += frameTime;

    while (accumulator >= dt) {
        advanceState(dt);
        accumulator -= dt;
    }

    broadcast({ type: 'updatePlayers', updatedPlayers: players });
    broadcast({ type: 'ballPosition', updatedBall: ball });
}, 16);

function advanceState(dt) {
    // player movement
    Object.keys(players).forEach(playerId => {
        players[playerId].pos += players[playerId].offset;
    })

    let dx = Math.cos(ball.heading) * bspeed * dt * 1000;
    let dy = Math.sin(ball.heading) * bspeed * dt * 1000;

    // ball.heading = Math.atan2(dy, dx);

    ball.x += dx;
    ball.y += dy;
    ball.angle = Math.atan2(ball.y, ball.x);

    const bdist = Math.sqrt(ball.x * ball.x + ball.y * ball.y);
    if (bdist > arena.radius - 10) {
        // Check for wall collisions
        if (ball.x <= -halfCanvasWidth + bradius || ball.x >= halfCanvasWidth - bradius) {
            ball.heading = (Math.PI - ball.heading) % (2 * Math.PI);
            ball.score -= 1;
        }
        if (ball.y <= -halfCanvasHeight + bradius || ball.y >= halfCanvasHeight - bradius) {
            ball.heading = -ball.heading;
            ball.score -= 1;
        }

        // Check for paddle collisions
        Object.keys(players).forEach(playerId => {
            const player_position = players[playerId].pos;
            const player_angle = arena[playerId].angle;

            const bangle = ball.angle - player_angle;
            const bx = bdist * Math.cos(bangle);
            const by = bdist * Math.sin(bangle);

            if (bx + bradius >= arena.radius && bx - bradius <= arena.radius + arena.pThin) {
                const bnormy = by - player_position;
                if (bnormy + bradius > -arena.pLong / 2 && bnormy - bradius < arena.pLong / 2) {
                    const bnormheading = ball.heading - player_angle;
                    const newheading = player_angle + Math.PI - bnormheading;
                    ball.heading = (newheading) % (Math.PI * 2);
                    ball.score += 1;
                }
            }
        });
    }
}

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});