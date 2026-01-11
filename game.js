const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
// --- BASIS-EINSTELLUNGEN (Hier kannst du experimentieren!) ---
const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;
const GRAVITY = 0.5; // Wie stark zieht die Erde? (0.2 = Mond, 1.5 = Jupiter)
const JUMP_FORCE = -10; // Wie fest springt dein Charakter?
const GROUND_Y = GAME_HEIGHT - 50; // Wo ist der Boden?

// --- SPIEL-ZUSTAND (Was passiert gerade?) ---
let isActive = false; // Läuft das Spiel oder sind wir im Menü?
let score = 0;
let frames = 0;
let gameSpeed = 5; // Wie schnell saust die Welt an dir vorbei?

// Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('final-score');
const hud = document.getElementById('hud');

// Initialize Canvas resolution
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// Das ist dein Charakter!
class Player {
    constructor() {
        this.width = 35;
        this.height = 35;
        this.x = 100;
        this.y = GROUND_Y - this.height;
        this.vy = 0; // Vertikale Geschwindigkeit (hoch/runter)
        this.angle = 0; // Drehung beim Springen
        this.isGrounded = true; // Steht er am Boden?
        this.canDoubleJump = true; // Kann er noch einmal in der Luft springen?
        this.color = '#ff00ffff'; // Die Leuchtfarbe deines Spielers
        this.trail = []; // Für den Geometry Dash Schweif
        this.trailMax = 10;
    }

    // Wenn du klickst, passiert das hier:
    jump() {
        if (this.isGrounded) {
            this.vy = JUMP_FORCE; // Ein kräftiger Stoß nach oben!
            this.isGrounded = false;
            this.canDoubleJump = true; // Nach dem ersten Sprung ist der Doppel-Sprung bereit
        } else if (this.canDoubleJump) {
            this.vy = JUMP_FORCE * 0.8; // Ein etwas schwächerer Stoß für den zweiten Sprung
            this.canDoubleJump = false; // Jetzt ist er verbraucht
        }
    }

    createJumpParticles(game) {
        for (let i = 0; i < 10; i++) {
            game.particles.push(new Particle(this.x + this.width / 2, this.y + this.height, this.color));
        }
    }

    // Das passiert in JEDEM Bild (Frame) des Spiels:
    update() {
        // Die Schwerkraft zieht immer...
        this.vy += GRAVITY;
        this.y += this.vy;

        // Sind wir auf dem Boden gelandet?
        if (this.y >= GROUND_Y - this.height) {
            this.y = GROUND_Y - this.height;
            this.vy = 0;
            this.isGrounded = true;
            this.canDoubleJump = true;

            // Wenn wir landen, stellen wir uns wieder gerade hin
            this.angle = Math.round(this.angle / (Math.PI / 2)) * (Math.PI / 2);
        } else {
            // Wenn wir in der Luft sind, machen wir einen Salto!
            this.angle += 0.15;
            this.isGrounded = false;
        }

        // Trail speichern
        this.trail.unshift({ x: this.x, y: this.y, angle: this.angle });
        if (this.trail.length > this.trailMax) {
            this.trail.pop();
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.angle);

        // Glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20;

        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Inner detail
        ctx.fillStyle = '#006effff';
        ctx.fillRect(-this.width / 4, -this.height / 4, this.width / 2, this.height / 2);

        ctx.restore();
    }
}

class Obstacle {
    constructor(gameWidth, speed, difficultyFactor = 0) {
        this.gameWidth = gameWidth;
        this.x = gameWidth;
        this.width = 40;
        this.height = 40;
        this.markedForDeletion = false;

        // Difficulty Factor (0 bis 1): Erhöht die Chance auf Sägeblätter
        const bladeChance = 0.1 + (difficultyFactor * 0.4); // Startet bei 10%, geht hoch bis 50%
        const types = ['spike', 'block', 'blade'];
        const weights = [0.4, 0.4, 0.2]; // Standard-Gewichte

        let type;
        if (Math.random() < bladeChance) {
            type = 'blade';
        } else {
            type = Math.random() < 0.5 ? 'spike' : 'block';
        }
        this.type = type;

        if (this.type === 'spike') {
            this.y = GROUND_Y - this.height;
            this.color = '#b300ffe2'; // Danger Red
        } else if (this.type === 'blade') {
            this.height = 40;
            this.width = 40;
            this.y = GROUND_Y - this.height - (Math.random() < 0.5 ? 0 : 50); // Floor or flying
            this.color = '#fff'; // White/Metal
            this.angle = 0;
        } else {
            this.y = GROUND_Y - this.height;
            this.width = 60;
            if (Math.random() < 0.3) {
                this.y -= 50; // floating block
            }
            this.color = '#00f3ff'; // Safe Blue
        }
    }

    update(speed) {
        this.x -= speed;
        if (this.type === 'blade') {
            this.angle += 0.2;
        }
        if (this.x + this.width < 0) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        if (this.type === 'spike') {
            ctx.fillStyle = this.color;
            // Draw Triple Spikes for more "brutality"
            const spikeCount = 3;
            const singleSpikeWidth = this.width / spikeCount;
            for (let i = 0; i < spikeCount; i++) {
                ctx.beginPath();
                ctx.moveTo(this.x + i * singleSpikeWidth, this.y + this.height);
                ctx.lineTo(this.x + i * singleSpikeWidth + singleSpikeWidth / 2, this.y);
                ctx.lineTo(this.x + (i + 1) * singleSpikeWidth, this.y + this.height);
                ctx.fill();
            }
        } else if (this.type === 'blade') {
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.angle);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;

            // Draw a buzzsaw shape
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const r1 = this.width / 2;
                const r2 = this.width / 4;
                ctx.lineTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
                ctx.lineTo(Math.cos(angle + 0.3) * r2, Math.sin(angle + 0.3) * r2);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fill();
        } else {
            // Draw Block (Super Mario Style)
            if (this.y < GROUND_Y - this.height - 10) {
                // Question Mark Block (Flying)
                ctx.fillStyle = '#ffcc00';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.x, this.y, this.width, this.height);

                // Draw a simple "?"
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('?', this.x + this.width / 2, this.y + this.height * 0.7);
            } else {
                // Green Pipe (Ground)
                ctx.fillStyle = '#2ecc71';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                ctx.strokeStyle = '#27ae60';
                ctx.lineWidth = 3;
                ctx.strokeRect(this.x, this.y, this.width, this.height);

                // Pipe Top
                ctx.fillStyle = '#2ecc71';
                ctx.fillRect(this.x - 5, this.y, this.width + 10, 15);
                ctx.strokeRect(this.x - 5, this.y, this.width + 10, 15);
            }
        }
        ctx.restore();
    }
}

class Cloud {
    constructor() {
        this.reset();
        this.x = Math.random() * GAME_WIDTH;
    }

    reset() {
        this.x = GAME_WIDTH + 100;
        this.y = Math.random() * (GROUND_Y - 150);
        this.width = Math.random() * 60 + 40;
        this.height = this.width * 0.6;
        this.speed = Math.random() * 0.5 + 0.2;
    }

    update() {
        this.x -= this.speed;
        if (this.x + this.width < 0) this.reset();
    }

    draw() {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#fff';

        // Draw 3 circles to make a cloud shape
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.height / 2, 0, Math.PI * 2);
        ctx.arc(this.x + this.width * 0.4, this.y - this.height * 0.2, this.height * 0.6, 0, Math.PI * 2);
        ctx.arc(this.x + this.width * 0.8, this.y, this.height * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Hill {
    constructor() {
        this.reset();
        this.x = Math.random() * GAME_WIDTH;
    }

    reset() {
        this.x = GAME_WIDTH + 200;
        this.width = Math.random() * 150 + 100;
        this.height = Math.random() * 80 + 40;
        this.color = Math.random() < 0.5 ? '#1a4d1a' : '#143d14';
    }

    update(speed) {
        this.x -= speed * 0.3; // Parallax effect
        if (this.x + this.width < 0) this.reset();
    }

    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, GROUND_Y, this.width / 2, this.height, 0, Math.PI, 0);
        ctx.fill();

        // Add a highlight line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        // Use the player color or a vibrant variation
        const colors = [color, '#00ccffff', '#ffffff'];
        this.color = colors[Math.floor(Math.random() * colors.length)];

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
        this.size = Math.random() * 6 + 2;
        this.angle = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15; // softened gravity for particles
        this.life -= this.decay;
        this.angle += this.rotationSpeed;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;

        // Glow for larger particles
        if (this.size > 4) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
        }

        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
        ctx.globalAlpha = 1.0;
    }
}

class BackgroundSymbol {
    constructor() {
        this.x = GAME_WIDTH + Math.random() * 500;
        this.y = Math.random() * (GROUND_Y - 100);
        this.size = Math.random() * 20 + 10;
        this.speed = Math.random() * 2 + 1;
        this.color = Math.random() < 0.5 ? 'rgba(255, 0, 255, 0.1)' : 'rgba(0, 243, 255, 0.1)';
        this.type = Math.random() < 0.5 ? 'circle' : 'square';
    }

    update() {
        this.x -= this.speed;
        if (this.x + this.size < 0) {
            this.x = GAME_WIDTH + 100;
            this.y = Math.random() * (GROUND_Y - 100);
        }
    }

    draw() {
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        if (this.type === 'circle') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.strokeRect(this.x, this.y, this.size * 2, this.size * 2);
        }
        ctx.restore();
    }
}

class Game {
    constructor() {
        this.player = new Player();
        this.obstacles = [];
        this.particles = [];
        this.bgSymbols = [];
        this.clouds = [];
        this.hills = [];
        for (let i = 0; i < 50; i++) {
            this.bgSymbols.push(new BackgroundSymbol());
        }
        for (let i = 0; i < 5; i++) {
            this.clouds.push(new Cloud());
        }
        for (let i = 0; i < 3; i++) {
            this.hills.push(new Hill());
        }
        this.obstacleTimer = 0;
        this.obstacleInterval = 1500;
        this.randomInterval = Math.random() * 100 + 100;
        this.shakeIntensity = 0;
        this.gridOffset = 0;

        this.bindEvents();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    reset() {
        isActive = false;
        score = 0;
        frames = 0;
        gameSpeed = 5;
        this.obstacles = [];
        this.particles = [];
        this.player = new Player();
        this.draw();
    }

    start() {
        if (isActive) return;

        isActive = true;
        score = 0;
        frames = 0;
        gameSpeed = 5;
        this.obstacles = [];
        this.particles = [];
        this.player = new Player();

        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        hud.classList.remove('hidden');
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 200; i++) {
            this.particles.push(new Particle(x, y, color));
        }
        this.shakeIntensity = 15; // Start the screen shake!
    }

    gameOver() {
        if (!isActive) return; // Prevent double trigger

        isActive = false;

        // Explosion at player center
        const centerX = this.player.x + this.player.width / 2;
        const centerY = this.player.y + this.player.height / 2;
        this.createExplosion(centerX, centerY, this.player.color);

        // Gib dem Spieler Zeit, die Explosion zu sehen (1.2 Sekunden)
        setTimeout(() => {
            // Nur anzeigen, wenn wir nicht in der Zwischenzeit schon wieder neu gestartet haben
            if (!isActive) {
                gameOverScreen.classList.remove('hidden');
                finalScoreDisplay.textContent = Math.floor(score);
                hud.classList.add('hidden');
            }
        }, 1200);
    }

    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('restart-btn').addEventListener('click', () => this.start());

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                if (!isActive) {
                    if (!startScreen.classList.contains('hidden') || !gameOverScreen.classList.contains('hidden')) {
                        this.start();
                    }
                } else {
                    this.player.jump();
                    if (isActive) this.player.createJumpParticles(this);
                }
            }
        });

        canvas.addEventListener('mousedown', () => {
            if (isActive) {
                this.player.jump();
                this.player.createJumpParticles(this);
            }
        });

        // Prevent default space scrolling
        window.addEventListener('keydown', function (e) {
            if (e.code == "Space" && e.target == document.body) {
                e.preventDefault();
            }
        });
    }

    addObstacle() {
        // Berechne Schwierigkeit (0 bis 1), basierend auf Frames (Max bei 5000 Frames erreicht)
        const difficultyFactor = Math.min(frames / 5000, 1);
        this.obstacles.push(new Obstacle(GAME_WIDTH, gameSpeed, difficultyFactor));
    }

    checkCollisions() {
        // Ground Logic handled in Player.update already, but we need to reset platform state
        let onPlatform = false;

        for (let obstacle of this.obstacles) {
            // Simple AABB Collision
            if (
                this.player.x < obstacle.x + obstacle.width &&
                this.player.x + this.player.width > obstacle.x &&
                this.player.y < obstacle.y + obstacle.height &&
                this.player.y + this.player.height > obstacle.y
            ) {
                // Collision Detected
                if (obstacle.type === 'spike' || obstacle.type === 'blade') {
                    this.gameOver();
                    return;
                } else if (obstacle.type === 'block') {
                    // Check if landing on top
                    // We check if the player's bottom was approximately at or above the obstacle's top
                    // and moving downwards.
                    const tolerance = 15; // pixels buffer
                    // Check relative position
                    const playerBottom = this.player.y + this.player.height;
                    const obstacleTop = obstacle.y;

                    // If player overlaps primarily from top
                    if (playerBottom - this.player.vy <= obstacleTop + tolerance && this.player.vy >= 0) {
                        // Landed on block
                        this.player.y = obstacleTop - this.player.height;
                        this.player.vy = 0;
                        this.player.isGrounded = true;
                        this.player.canDoubleJump = true;
                        onPlatform = true;

                        // Snap angle
                        this.player.angle = Math.round(this.player.angle / (Math.PI / 2)) * (Math.PI / 2);
                    } else {
                        // Hit side or bottom -> Crash
                        this.gameOver();
                        return;
                    }
                }
            }
        }
    }

    update() {
        // Even if game over, update particles
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.life > 0);

        // Update background symbols
        this.bgSymbols.forEach(s => s.update());

        // Update Screen Shake
        if (this.shakeIntensity > 0) {
            this.shakeIntensity *= 0.9;
            if (this.shakeIntensity < 0.5) this.shakeIntensity = 0;
        }

        if (!isActive) return;

        this.player.update();

        // Hindernisse spawnen (Abstand wird mit der Zeit kürzer!)
        if (frames % Math.floor(this.randomInterval) === 0) {
            this.addObstacle();

            // Schwierigkeits-Kurve: Am Anfang 100-150 Frames, später nur noch 40-70
            const minGap = Math.max(90 - (frames / 50), 40);
            const maxGap = Math.max(150 - (frames / 40), 70);

            this.randomInterval = Math.random() * (maxGap - minGap) + minGap;
        }

        this.obstacles.forEach(obstacle => {
            obstacle.update(gameSpeed);
        });

        this.obstacles = this.obstacles.filter(obstacle => !obstacle.markedForDeletion);

        this.gridOffset = (this.gridOffset + gameSpeed) % 50;

        this.clouds.forEach(c => c.update());
        this.hills.forEach(h => h.update(gameSpeed));

        this.checkCollisions();

        frames++;
        score += 0.1;
        scoreDisplay.textContent = Math.floor(score);

        // Kontinuierliche Geschwindigkeitssteigerung
        if (frames % 200 === 0) {
            gameSpeed += 0.2; // Kleiner, aber öfter!
        }
    }

    draw() {
        ctx.save();

        // Apply Screen Shake
        if (this.shakeIntensity > 0) {
            const dx = (Math.random() - 0.5) * this.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.shakeIntensity;
            ctx.translate(dx, dy);
        }

        // Clear screen
        ctx.clearRect(-20, -20, GAME_WIDTH + 40, GAME_HEIGHT + 40);

        // Background (Sky Blue)
        ctx.fillStyle = '#1a1a4d'; // Deep night blue
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Draw Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let x = -this.gridOffset; x < GAME_WIDTH; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, GROUND_Y);
            ctx.stroke();
        }
        for (let y = 0; y < GROUND_Y; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(GAME_WIDTH, y);
            ctx.stroke();
        }

        // Draw Hills & Clouds
        this.hills.forEach(h => h.draw());
        this.clouds.forEach(c => c.draw());

        // Draw Background Symbols
        this.bgSymbols.forEach(s => s.draw());

        // Floor with glowing line (Mario Green)
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(0, GROUND_Y, GAME_WIDTH, 5);
        ctx.shadowBlur = 0;

        // Floor body (Dirt)
        ctx.fillStyle = '#4d2600';
        ctx.fillRect(0, GROUND_Y + 5, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);

        // Draw Everything
        this.obstacles.forEach(obstacle => obstacle.draw());
        this.particles.forEach(p => p.draw());

        if (isActive) {
            this.player.draw();
        } else {
            // Draw idle player ONLY on start screen. 
            if (!startScreen.classList.contains('hidden')) {
                ctx.save();
                ctx.translate(100 + 20, GROUND_Y - 40 + 20);
                ctx.shadowColor = '#00f3ff';
                ctx.shadowBlur = 20;
                ctx.fillStyle = '#00f3ff';
                ctx.fillRect(-20, -20, 40, 40);
                ctx.fillStyle = '#fff';
                ctx.fillRect(-10, -10, 20, 20);
                ctx.restore();
            }
        }

        // Progress Bar
        const progress = Math.min((frames / 5000) * GAME_WIDTH, GAME_WIDTH);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(0, 0, GAME_WIDTH, 5);
        ctx.fillStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 10;
        ctx.fillRect(0, 0, progress, 5);
        ctx.shadowBlur = 0;

        ctx.restore(); // Ensure we restore the shake or any other transformations
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }
}

// Start Game Instance
const game = new Game();
