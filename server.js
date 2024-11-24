const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

let arena = { radius : 140, pLong: 50, pThin: 3 };
let playerMoveLimit = 150;
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
    vx: 0,
    vy: 0,
    mass: 1
    combo: 0,
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


    //Re initialize forces
    initializeForces();

    arena.radius = totalPlayers == 3 ? 100 : 110;
    arena.pLong = totalPlayers > 5 ? 50 - 5*(totalPlayers-5) : 50;
};

const playerColors = [
    '#ff5733', // Red-Orange
    '#33ff57', // Green
    '#3357ff', // Blue
    '#ff33a1', // Pink
    '#ffbd33', // Yellow-Orange
    '#33fff5', // Cyan
    '#306430', // Dark green
    '#ffffff', // White
    '#a133ff', // Purple
    '#FFDE21', // Yellow
];
let currentColorIndex = 0;

wss.on('connection', (ws) => {
    const playerId = Date.now(); // Use timestamp as a unique ID
    console.log('A player connected:', playerId);
    ws.send(JSON.stringify({ type: 'yourId', id: playerId }));

    const pColor = playerColors[currentColorIndex];
    currentColorIndex = (currentColorIndex + 1) % playerColors.length;

    arena[playerId] = { angle: 0, color: pColor };
    
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

// Function to generate random forces within a given range
let previousForceAngle = 0
function generateRandomForce() {
    const fx = Math.floor(Math.random() * 41) - 20; 
    const fy = Math.floor(Math.random() * 41) - 20;
    
    return { 
        fx: fx, 
        fy: fy
    };
}

// Init forces
function initializeForces() {

    forces = [];

    const playerIds = Object.keys(players);

    playerIds.forEach((playerId, index) => {
        forces.push(generateRandomForce());
    });
}

// Re init force segments
function reInitForces(exludedSegment) {
    for (let i = 0; i < forces.length; i++) {

        if (i != exludedSegment) {
            //Re init force segments where ball is currently not in
            forces[i] = generateRandomForce();
        }
    }
}

//Add Force segment
function addForce() {
    forces.push(generateRandomForce());
}

// Function to determine the active force based on ball's position
// Function to calculate angle and determine the active force
function getForce(ball) {
    // Calculate angle (atan2 returns in radians)
    const dx = ball.x; // Offset from the center
    const dy = ball.y;
    let angle = (Math.atan2(dy, dx)) * (180 / Math.PI); // Convert to degrees


    // Normalize angle to [0, 360)
    if (angle < 0) angle += 360;

    // Determine the segment 
    const segment = Math.floor(angle / (360 / forces.length));

    // Return the corresponding force
    return segment;
}

// Force definitions
let forces = [];


//Collision
let wallCollisionCnt_x = 0
let wallCollisionCnt_y = 0
let playerCollisionCnt = 0

let lastBounceId = 0;
function advanceState(dt) {
    // player movement
    Object.keys(players).forEach(playerId => {
        if (players[playerId].offset != 0) {
            const newPos = players[playerId].pos + players[playerId].offset
            if (Math.abs(newPos) < 130) players[playerId].pos = newPos;
        }
    })

    if (forces.length >= 1) {
        //Get Force
        const forceSegment = getForce(ball);
        console.log(forceSegment)
        const force = forces[forceSegment];

        // Calculate acceleration
        const ax = force.fx / ball.mass;
        const ay = force.fy / ball.mass;
        // Update position
        let dx =  ball.vx * dt + (ax * dt * dt) / 2;
        let dy =  ball.vy * dt + (ay * dt * dt) / 2;
        // Update velocity
        ball.vx = dx / dt;
        ball.vy = dy / dt;

        // Calculate Heading
        ball.heading = Math.atan2(dy, dx);

        //Change position
        ball.x += dx;
        ball.y += dy;

        ball.angle = Math.atan2(ball.y, ball.x);

        const bdist = Math.sqrt(ball.x * ball.x + ball.y * ball.y);
        if (bdist > arena.radius - 10) {
            // Check for wall collisions
            if ( (ball.x <= -halfCanvasWidth + bradius || ball.x >= halfCanvasWidth - bradius) && wallCollisionCnt_x==0) {
                ball.heading = (Math.PI - ball.heading) % (2 * Math.PI);
                ball.score -= 1;

                //Adjust Force
                let _force = Math.sqrt(force.fx ** 2 + force.fy ** 2);
                let _v = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
                forces[forceSegment].fx = _force * Math.cos(ball.heading);
                forces[forceSegment].fy = _force * Math.sin(ball.heading+ Math.PI);
                ball.vx = _v * Math.cos(ball.heading);
                ball.vy = _v * Math.sin(ball.heading);
                wallCollisionCnt_x = 1;
                ball.combo = 0;
                lastBounceId = 0;
            } else {
                wallCollisionCnt_x = 0;
            }
            if ((ball.y <= -halfCanvasHeight + bradius || ball.y >= halfCanvasHeight - bradius) && wallCollisionCnt_y==0) {
                ball.heading = -ball.heading;
                ball.score -= 1;

                //Adjust Force
                let _force = Math.sqrt(force.fx ** 2 + force.fy ** 2);
                let _v = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
                forces[forceSegment].fx = _force * Math.cos(ball.heading);
                forces[forceSegment].fy = _force * Math.sin(ball.heading);
                ball.vx = _v * Math.cos(ball.heading);
                ball.vy = _v * Math.sin(ball.heading);
                wallCollisionCnt_y = 1
                ball.combo = 0;
                lastBounceId = 0;
            } else {
                wallCollisionCnt_y = 0;
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


                        //Reinit forces
                        reInitForces(forceSegment);


                        //Adjust Force
                        let _force = Math.sqrt(force.fx ** 2 + force.fy ** 2);
                        let _v = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
                        forces[forceSegment].fx = _force * Math.cos(ball.heading);
                        forces[forceSegment].fy = _force * Math.sin(ball.heading);
                        ball.vx = _v * Math.cos(ball.heading);
                        ball.vy = _v * Math.sin(ball.heading);
                        playerCollisionCnt = 1;
                        if (playerId != lastBounceId) {
                        ball.score += ball.combo;
                        ball.combo += 1;
                        lastBounceId = playerId;
                    }

                    } else {
                        playerCollisionCnt = 0;
                    }
                }
            });
            
        }
    }
}

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});