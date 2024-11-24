const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const circle = {
    radius: 50,
    x: 0,
    y: 0,
    color: 'blue'
};

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);

        const angle = Math.atan2

        // RECTANGLE
        ctx.save();
        ctx.fillStyle = 'lightgray';
        ctx.rotate(rectangle.angle);
        ctx.fillRect(-1000, rectangle.x -rectangle.height / 2, 2000, rectangle.height);
        ctx.fillRect(200, -1000, rectangle.width, 2000);
        ctx.fillStyle = 'gray';
        ctx.fillRect(200, rectangle.x -rectangle.height / 2, rectangle.width, rectangle.height);
        ctx.restore();

        // BALL
        ctx.fillStyle = circle.color;
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.fill();

    ctx.restore();
}

canvas.addEventListener('mousemove', (event) => {
    // Get the canvas position
    const rect = canvas.getBoundingClientRect();

    // Calculate mouse position relative to the canvas
    circle.x = event.clientX - rect.left - 400;
    circle.y = event.clientY - rect.top - 400;

    if (checkCollision()) {
        circle.color = 'red';
    } else {
        circle.color = 'blue';
    }

    draw();
});

// Initial draw
draw();







    // if (angleChanged) {
    //     angleChanged = false;

    //     if (Object.keys(players).length > 0) {
    //         const normBallAngle = ball.angle - Math.PI / 2;

    //         let closestPlayerId = null;
    //         let closestAngleDiff = Infinity;

    //         Object.keys(players).forEach(playerId => {
    //             const player = players[playerId];
    //             const angleDiff = Math.abs(player.angle - normBallAngle);
    //             const wrappedAngleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);

    //             if (wrappedAngleDiff < closestAngleDiff) {
    //                 closestAngleDiff = wrappedAngleDiff;
    //                 closestPlayerId = playerId;
    //             }
    //         });

    //         ball.playerToIntercept = closestPlayerId;
    //     }
    // }
