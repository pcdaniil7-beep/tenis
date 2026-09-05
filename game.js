const peer = new Peer();
let conn = null;
let isHost = false;

const lobby = document.getElementById('lobby');
const gameContainer = document.getElementById('game-container');
const myIdEl = document.getElementById('my-id');
const statusEl = document.getElementById('status');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Стан гри
const paddleWidth = 12, paddleHeight = 90;
let player1Y = canvas.height / 2 - paddleHeight / 2;
let player2Y = canvas.height / 2 - paddleHeight / 2;
let ball = { x: canvas.width / 2, y: canvas.height / 2, dx: 5, dy: 3, radius: 8 };
let score1 = 0, score2 = 0;

// Отримання власного ID
peer.on('open', (id) => {
    myIdEl.innerText = id;
});

// Підключення другого гравця (Host)
peer.on('connection', (connection) => {
    conn = connection;
    isHost = true;
    setupConnection();
});

// Підключення до першого гравця (Client)
function connectToPeer() {
    const peerId = document.getElementById('peer-id-input').value;
    if (!peerId) return alert('Введіть ID!');
    statusEl.innerText = 'Підключення...';
    conn = peer.connect(peerId);
    isHost = false;
    setupConnection();
}

function copyID() {
    navigator.clipboard.writeText(myIdEl.innerText);
    alert('ID скопійовано!');
}

function setupConnection() {
    conn.on('open', () => {
        lobby.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        document.addEventListener('keydown', handleInput);
        document.addEventListener('keyup', handleKeyUp);
        
        if (isHost) requestAnimationFrame(gameLoop);
    });

    conn.on('data', (data) => {
        if (isHost) {
            if (data.type === 'input') player2Y = data.y;
        } else {
            if (data.type === 'state') {
                player1Y = data.p1;
                player2Y = data.p2;
                ball = data.ball;
                score1 = data.score1;
                score2 = data.score2;
                render();
            }
        }
    });
}

let moveUp = false, moveDown = false;

function handleInput(e) {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') moveUp = true;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') moveDown = true;
}

function handleKeyUp(e) {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') moveUp = false;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') moveDown = false;
}

function updatePositions() {
    const speed = 7;
    if (isHost) {
        if (moveUp && player1Y > 0) player1Y -= speed;
        if (moveDown && player1Y < canvas.height - paddleHeight) player1Y += speed;
    } else {
        let newY = player2Y;
        if (moveUp && newY > 0) newY -= speed;
        if (moveDown && newY < canvas.height - paddleHeight) newY += speed;
        conn.send({ type: 'input', y: newY });
    }
}

function updatePhysics() {
    if (!isHost) return;

    ball.x += ball.dx;
    ball.y += ball.dy;

    // Відбиття від верхньої/нижньої стінок
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) ball.dy *= -1;

    // Відбиття від ракетки 1 (Host)
    if (ball.x - ball.radius < 20 + paddleWidth && ball.y > player1Y && ball.y < player1Y + paddleHeight) {
        ball.dx = Math.abs(ball.dx) + 0.2;
    }

    // Відбиття від ракетки 2 (Client)
    if (ball.x + ball.radius > canvas.width - 20 - paddleWidth && ball.y > player2Y && ball.y < player2Y + paddleHeight) {
        ball.dx = -Math.abs(ball.dx) - 0.2;
    }

    // Гол
    if (ball.x < 0) { score2++; resetBall(); }
    if (ball.x > canvas.width) { score1++; resetBall(); }

    // Відправка стану клієнту
    conn.send({
        type: 'state',
        p1: player1Y, p2: player2Y,
        ball: ball, score1: score1, score2: score2
    });
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * 5;
    ball.dy = (Math.random() > 0.5 ? 1 : -1) * 3;
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Сітка по центру
    ctx.strokeStyle = '#334155';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Ракетки
    ctx.fillStyle = '#00fff5';
    ctx.fillRect(20, player1Y, paddleWidth, paddleHeight);
    ctx.fillRect(canvas.width - 20 - paddleWidth, player2Y, paddleWidth, paddleHeight);

    // М'яч
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#e94560';
    ctx.fill();

    // Рахунок
    document.getElementById('score1').innerText = score1;
    document.getElementById('score2').innerText = score2;
}

function gameLoop() {
    updatePositions();
    updatePhysics();
    render();
    requestAnimationFrame(gameLoop);
}