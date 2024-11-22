const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let players = {};

let score = 0;

// Ball object with initial properties
let ball = {
    x: 300, // Initial x position
    y: 300, // Initial y position
    vx: 0.0, // Initial velocity in x-direction
    vy: 0.0, // Initial velocity in y-direction
    mass: 1, // Mass of the ball
};
// Function to generate random forces within a given range
function generateRandomForce() {
    const fx = Math.random() * 5 - 2; // Random force between 5 and 10
    const fy = Math.random() * 5 - 2; // Random force between 5 and 10
    return { fx, fy };
}

// Init forces
function initializeForces() {

    for (const id in players) {
        if (players.hasOwnProperty(id)) {
            forces.push( generateRandomForce() );
        }
    }
}

// Add Force
function addForce() {
    forces.push( generateRandomForce() );
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

// Force definitions for each 45-degree segment (randomized)
let forces = [];
// Time step (in seconds)
const dt = 0.016;

// Serve static files (client-side code)
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Add new player to the game
    players[socket.id] = { x: 0, y: 0 }; // Initial position

    //Create Angles
    const angleDist = 2* Math.PI / Object.keys(players).length;
    let newAngle = 0
    for (const id in players) {
        if (players.hasOwnProperty(id)) {
            players[id].angle = newAngle;
            newAngle += angleDist;
        }
    }

    //Initialize Forces
    initializeForces();

    socket.on('playerMove', (direction) => {
        const player = players[socket.id];
        if (!player) return;

        if (direction === 'a') {
            player.y -= 100; // Move left
        } else if (direction === 'd') {
            player.y += 100; // Move right
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
    const segment = Math.floor(angle / (360 / forces.length));

    // Return the corresponding force
    return segment;
}


//Check wether ball overlaps with rectangle
function isOverlap(ball, velocity, shift, angle, rect) {
    
    // Step 1: Update ball's position
    const ballNew = {
        x: ball.x + velocity.dx,
        y: ball.y + velocity.dy,
    };

    // Step 2: Shift the coordinate system
    const shifted = {
        x: ballNew.x - shift.dx,
        y: ballNew.y - shift.dy,
    };

    // Step 3: Rotate the coordinate system
    const angleRad = angle;
    const rotated = {
        x: shifted.x * Math.cos(angleRad) + shifted.y * Math.sin(angleRad),
        y: -shifted.x * Math.sin(angleRad) + shifted.y * Math.cos(angleRad),
    };

    // Step 4: Define the rectangle in the new coordinate system
    const rectRight = rect.x + rect.width;
    const rectBottom = rect.y + rect.height;

    // Step 5: Check for overlap
    const isInsideX = rotated.x+10 >= rect.x && rotated.x+10 <= rectRight;
    const isInsideY = rotated.y+10 >= rect.y && rotated.y+10 <= rectBottom;

    return isInsideX && isInsideY;
    
}


function reflectBallTransformed(ball, velocity, mass, rect, shift, angle) {
    // Convert angle to radians
    const angleRad = angle;

    // Helper function to rotate coordinates
    function rotate(x, y, alpha) {
        return {
            x: x * Math.cos(alpha) + y * Math.sin(alpha),
            y: -x * Math.sin(alpha) + y * Math.cos(alpha),
        };
    }

    // Step 1: Shift and rotate ball position and velocity to the transformed frame
    const shifted = {
        x: ball.x - shift.dx,
        y: ball.y - shift.dy,
    };
    const rotatedPos = rotate(shifted.x, shifted.y, angleRad);

    const rotatedVel = rotate(velocity.dx, velocity.dy, angleRad);


    // Step 2: Compute the ball's next position in the transformed frame
    const ballNext = {
        x: rotatedPos.x + rotatedVel.x * dt,
        y: rotatedPos.y + rotatedVel.y * dt,
    };



    // Step 3: Check collision with rectangle edges in the transformed frame
    const rectRight = rect.x + rect.width;
    const rectBottom = rect.y + rect.height;

    let reflectedVel = { dx: rotatedVel.x, dy: rotatedVel.y };



    if (ballNext.x >= rect.x && ballNext.x <= rectRight) {
        if (ballNext.y <= rect.y || ballNext.y >= rectBottom) {
            // Horizontal reflection
            reflectedVel.dy = -rotatedVel.y;
        }
    }
    if (ballNext.y >= rect.y && ballNext.y <= rectBottom) {
        if (ballNext.x <= rect.x || ballNext.x >= rectRight) {
            // Vertical reflection
            reflectedVel.dx = -rotatedVel.x;
        }
    }



    // Step 4: Transform the reflected velocity back to the original frame
    const inverseRotatedVel = rotate(reflectedVel.dx, reflectedVel.dy, -angleRad);


    // Step 5: Calculate force components
    const deltaV = {
        dx: inverseRotatedVel.x - velocity.dx,
        dy: inverseRotatedVel.y - velocity.dy,
    };

    let force = {
        fx: mass * (deltaV.dx) / dt,
        fy: mass * (deltaV.dy) / dt,
    };


    return {
        newVelocity: {
            dx: inverseRotatedVel.x,
            dy: inverseRotatedVel.y,
        },
        force,
    };
}


function collosionHandler() {

    for (const id in players) {
        const player = players[id];

        /*
        * Gather all data
        */

        //Select correct force
        let forceSegment = getForce(ball);
        let force = forces[forceSegment];

        // Calculate acceleration
        const ax = force.fx / ball.mass;
        const ay = force.fy / ball.mass;

        const velocity = {
            dx: ball.vx * dt + (ax * dt * dt) / 2,
            dy: ball.vy * dt + (ay * dt * dt) / 2
        }
        const shift = {
            dx: 300,
            dy: 300
        }

        // Calculate the rectangle position relative to the center
        const distFromCenter = 600 / 3;
        const _x = distFromCenter / Math.sqrt(2);
        const angle = player.angle;
        

        const rect = {
            x: _x * 1,
            y: -50 + player.y,
            width: 20,
            height: 100
        }
        const result = isOverlap(ball, velocity, shift, angle, rect);
        if (result == true) {
            console.log("Overlap with ", player.id, " angle: " ,angle);

            //Get forces, etc. after reflection
            const result = reflectBallTransformed(ball, velocity, 1, rect, shift, angle);

            
            ball.vx = result.newVelocity.dx;
            ball.vy = result.newVelocity.dy;


            console.log(ball.vx, " ", ball.vy)

            forces[forceSegment] = result.force;

            console.log(result.force)

            //Re initialize other force fields
            reInitForces(forceSegment);

            //Add new force field
            addForce();

            //Increase score
            score += 1;
            
            
        } else {
        }
    }
}



function gameReset() {
    ball = {
        x: 300, // Initial x position
        y: 300, // Initial y position
        vx: 0, // Initial velocity in x-direction
        vy: 0, // Initial velocity in y-direction
        mass: 1, // Mass of the ball
    };
    
    //Create new forces
    initializeForces();
}


// Update ball every 16ms
setInterval(() => {


    if(Object.keys(players).length > 1) { 

    //Start Collision Handler    
    collosionHandler();


    //Select correct force
    let forceSegment = getForce(ball);
    let force = forces[forceSegment];

    console.log(forceSegment)


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
    if ( ball.x >= 600 || ball.x <= 0 || ball.y >= 600|| ball.y <= 0) {
        //Reset Game
        gameReset();

        //Decrease Score
        score -= 1;
    }

}

    io.emit('ball', ball);
}, dt);

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
