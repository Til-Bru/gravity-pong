const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const radius = 200;
const radiussqd = radius*radius;

const circle = {
    radius: 50,
    x: 0,
    y: 0,
    color: 'blue'
};

const rectangle = {
    angle : Math.PI / 5,
    pos : 0,
    width: 80,
    height: 200
};

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);

        // RECTANGLE
        ctx.save();
        ctx.fillStyle = 'lightgray';
        ctx.rotate(rectangle.angle);
        ctx.fillRect(-1000, rectangle.pos -rectangle.height / 2, 2000, rectangle.height);
        ctx.fillRect(200, -1000, rectangle.width, 2000);
        ctx.fillStyle = 'gray';
        ctx.fillRect(200, rectangle.pos -rectangle.height / 2, rectangle.width, rectangle.height);
        ctx.restore();

        // BALL
        ctx.fillStyle = circle.color;
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.fill();

    ctx.restore();
}

function checkCollision() {
    
    const bdistsqd = circle.x * circle.x + circle.y * circle.y;
    const bdist = Math.sqrt(bdistsqd);
    
    const bangle = Math.atan2(circle.y, circle.x) - rectangle.angle;
    const bx = bdist * Math.cos(bangle);
    const by = bdist * Math.sin(bangle);

    if (bx + circle.radius > 200 && bx - circle.radius < 200 + rectangle.width) {
        const bnormy = by - rectangle.pos;
        if (bnormy + circle.radius > -100 && bnormy - circle.radius < 100) {
            return true;
        }
    }
    return false;
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