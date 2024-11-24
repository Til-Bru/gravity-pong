const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const canvasHeight = 300;
const halfCanvasHeight = 150;
const canvasWidth = 300;
const halfCanvasWidth = 150;

let scaleFactor = 1;
if (window.innerWidth > 600 && window.innerHeight > 600) {
    if (window.innerWidth > 900 && window.innerHeight > 900) {
        canvas.width = 900;
        canvas.height = 900;
        canvas.style.width = "900px";
        canvas.style.height = "900px";
        scaleFactor = 3;
    }
    else {
        canvas.width = 600;
        canvas.height = 600;
        canvas.style.width = "600px";
        canvas.style.height = "600px";
        scaleFactor = 2;
    }
}


let myId;
let myAngle = 0;
let players = {};
let arena = { radius: 140, pLong: 40, pThin: 3 };

let ball = { score: 0 };
const bradius = 4;

document.getElementById('button').addEventListener('click', () => {
    document.getElementById('button').style.display = 'none';
    canvas.style.display = 'block';

    const socket = new WebSocket('ws://localhost:3000');

    socket.onopen = () => {
        console.log('WebSocket connection established');
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'yourId') {
            myId = message.id;
            console.log(myId);
        } else if (message.type === 'updateArena') {
            arena = message.updatedArena;
            console.log(arena[myId].angle);
            myAngle = arena[myId].angle;
            // render();
        } else if (message.type === 'updatePlayers') {
            players = message.updatedPlayers;
            render();
        } else if (message.type === 'ballPosition') {
            ball = message.updatedBall;
            render();
        }
    };

    window.addEventListener('keydown', (event) => {
        let pOffset = 5;
        if (myAngle > 1.5708 && myAngle < 4.7124) {
            pOffset = -pOffset;
        }
        if (event.key === 'ArrowLeft' || event.key === 'a') {
            socket.send(JSON.stringify({ type: 'move', offset: pOffset }));
        } else if (event.key === 'ArrowRight' || event.key === 'd') {
            socket.send(JSON.stringify({ type: 'move', offset: -pOffset }));
        }
    });

    window.addEventListener('keyup', (event) => {
        if (event.key === 'ArrowLeft' || event.key === 'a') {
            socket.send(JSON.stringify({ type: 'move', offset: 0 }));
        } else if (event.key === 'ArrowRight' || event.key === 'd') {
            socket.send(JSON.stringify({ type: 'move', offset: 0 }));
        }
    });

    window.addEventListener('touchstart', (event) => {
        const touch = event.touches[0];
        const screenWidth = window.innerWidth;

        let pOffset = 5;
        if (myAngle > 1.5708 && myAngle < 4.7123) {
            pOffset = -pOffset;
        }

        if (touch.clientX < screenWidth / 2) {
            socket.send(JSON.stringify({ type: 'move', offset: pOffset }));
        } else {
            socket.send(JSON.stringify({ type: 'move', offset: -pOffset }));
        }
    });

    window.addEventListener('touchend', (event) => {
        socket.send(JSON.stringify({ type: 'move', offset: 0 }));
    });
});

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const playerIds = Object.keys(players);

    ctx.save();
    ctx.scale(scaleFactor, scaleFactor);

    // SCORE PRINT
    ctx.font = "20px serif";
    ctx.fillStyle = 'white';
    ctx.fillText('Score: ' + ball.score, 10, 25);

    // SETUP QUADRANTS
    ctx.translate(halfCanvasWidth, halfCanvasHeight);
    ctx.rotate(Math.PI / 2);

    playerIds.forEach((playerId) => {
        const player_angle = arena[playerId].angle;
        const player_position = players[playerId].pos;
        ctx.save();
        ctx.rotate(player_angle);
        ctx.fillStyle = playerId == myId ? 'yellow' : 'white';
        ctx.fillRect(arena.radius, player_position - arena.pLong / 2, arena.pThin, arena.pLong);
        ctx.restore();
    });

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, bradius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
