const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const circle = {
    radius: 50,
    x: 0,
    y: 0,
    color: 'blue'
};

const rectangle = {
    x: 200,
    y: 300,
    width: 300,
    height: 200
};

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw rectangle
    ctx.fillStyle = 'gray';
    ctx.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);

    // Draw circle
    ctx.fillStyle = circle.color;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    ctx.fill();
}

function checkCollision() {
    const closestX = Math.max(rectangle.x, Math.min(circle.x, rectangle.x + rectangle.width));
    const closestY = Math.max(rectangle.y, Math.min(circle.y, rectangle.y + rectangle.height));

    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;

    return (distanceX * distanceX + distanceY * distanceY) < (circle.radius * circle.radius);
}

canvas.addEventListener('mousemove', (event) => {
    // Get the canvas position
    const rect = canvas.getBoundingClientRect();

    // Calculate mouse position relative to the canvas
    circle.x = event.clientX - rect.left;
    circle.y = event.clientY - rect.top;

    if (checkCollision()) {
        circle.color = 'red';
    } else {
        circle.color = 'blue';
    }

    draw();
});

// Initial draw
draw();