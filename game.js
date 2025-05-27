class SnailRaceGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.winnerText = document.getElementById('winner-text');

        // Ajuster la taille du canvas pour correspondre à la taille de l'écran
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Chargement des images
        this.images = {
            playerIdle: new Image(),
            playerRun: new Image(),
            enemyIdle: new Image(),
            enemyRun: new Image(),
            lettuce: new Image()
        };

        this.images.playerIdle.src = 'escargot_idle.png';
        this.images.playerRun.src = 'escargot_run.png';
        this.images.enemyIdle.src = 'escargot_adversaire_idle.png';
        this.images.enemyRun.src = 'escargot_adversaire_run.png';
        this.images.lettuce.src = 'laitue.png';

        // Configuration du jeu
        this.snails = [];
        this.isGameRunning = false;
        this.tapCount = 0;
        this.lastTapTime = 0;
        this.minTapInterval = 100; // Délai minimum entre les appuis (en ms)
        this.maxSpeed = 2; // Vitesse maximale
        this.speedDecay = 0.98; // Décélération plus rapide
        this.isSpacePressed = false; // État de la touche espace

        // Configuration de l'IA adaptative
        this.playerPerformance = {
            wins: 0,
            totalGames: 0,
            lastWinTime: 0
        };
        this.aiDifficulty = 1.2; // Réduit la difficulté de base
        this.targetWinRate = 0.2; // Maintient le taux de victoire cible à 20%
        this.aiPersonality = [
            { baseSpeed: 0.8, aggression: 0.5 },  // IA moins agressive
            { baseSpeed: 1.0, aggression: 0.7 }   // IA modérément agressive
        ];
        this.lastBurstTime = [0, 0]; // Pour suivre les bursts de vitesse de chaque IA

        // Event listeners
        document.getElementById('startButton').addEventListener('click', () => this.startGame());
        document.getElementById('restartButton').addEventListener('click', () => this.startGame());
        this.canvas.addEventListener('touchstart', (e) => this.handleTap(e));
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Initialisation des positions
        this.initializeGame();

        // Éléments UI
        this.gameUI = document.getElementById('game-ui');
        this.progressFill = document.querySelector('.progress-fill');
        this.statsContainer = document.getElementById('stats-container');

        // Statistiques
        this.gamesPlayed = 0;
        this.gamesWon = 0;
        this.bestTime = Infinity;
        this.totalTime = 0;
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initializeGame() {
        const startY = this.canvas.height * 0.2;
        const spacing = this.canvas.height * 0.25;

        this.snails = [
            {
                x: 10,
                y: startY,
                speed: 0,
                isPlayer: true,
                currentImage: 'playerIdle',
                width: 60,
                height: 40
            },
            {
                x: 10,
                y: startY + spacing,
                speed: 0,
                isPlayer: false,
                currentImage: 'enemyIdle',
                width: 60,
                height: 40
            },
            {
                x: 10,
                y: startY + spacing * 2,
                speed: 0,
                isPlayer: false,
                currentImage: 'enemyIdle',
                width: 60,
                height: 40
            }
        ];

        this.finishLine = this.canvas.width - 80;
    }

    startGame() {
        this.initializeGame();
        this.isGameRunning = true;
        this.startScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.gameUI.classList.remove('hidden');
        this.animate();
    }

    handleKeyDown(e) {
        if (!this.isGameRunning) return;
        if (e.code === 'Space' && !this.isSpacePressed) {
            e.preventDefault();
            this.isSpacePressed = true;
            this.acceleratePlayer();
        }
    }

    handleKeyUp(e) {
        if (e.code === 'Space') {
            this.isSpacePressed = false;
        }
    }

    handleTap(e) {
        e.preventDefault();
        if (!this.isGameRunning) return;
        this.acceleratePlayer();
    }

    acceleratePlayer() {
        const now = Date.now();
        const timeSinceLastTap = now - this.lastTapTime;

        // Vérifier si le délai minimum est respecté
        if (timeSinceLastTap < this.minTapInterval) {
            return; // Ignorer l'appui si trop rapide
        }

        // Calculer la vitesse en fonction du temps entre les appuis
        let speedBoost = 0.2; // Boost de base
        if (timeSinceLastTap < 500) { // Si les appuis sont rapprochés
            this.tapCount++;
            speedBoost = Math.min(0.5, this.tapCount * 0.05); // Augmentation progressive mais limitée
        } else {
            this.tapCount = 1; // Réinitialiser le compteur si trop lent
        }

        // Appliquer la nouvelle vitesse avec une limite maximale
        this.snails[0].speed = Math.min(this.maxSpeed, this.snails[0].speed + speedBoost);
        this.lastTapTime = now;
    }

    updateAI() {
        // Mise à jour des escargots IA
        this.snails.forEach((snail, index) => {
            if (!snail.isPlayer) {
                const personality = this.aiPersonality[index - 1];
                const timeSinceLastWin = Date.now() - this.playerPerformance.lastWinTime;
                
                // Calculer la vitesse de base avec une variation plus subtile
                let baseSpeed = personality.baseSpeed * this.aiDifficulty;
                
                // Ajouter une variation aléatoire moins agressive
                if (Math.random() < 0.02) { // Réduit la fréquence des variations
                    const maxAISpeed = (1.2 + personality.aggression * 0.3) * this.aiDifficulty;
                    const minAISpeed = (0.9 - personality.aggression * 0.1) * this.aiDifficulty;
                    snail.speed = Math.random() * (maxAISpeed - minAISpeed) + minAISpeed;
                }

                // Décélération progressive plus rapide
                snail.speed *= 0.995;

                // Ajustements basés sur la position
                const playerPosition = this.snails[0].x;
                const aiPosition = snail.x;
                const distanceToPlayer = aiPosition - playerPosition;
                
                // Ajustements de vitesse moins agressifs
                if (distanceToPlayer > 120) {
                    snail.speed *= 0.995; // Ralentissement plus important
                } else if (distanceToPlayer < -80) {
                    // Accélération moins agressive si le joueur est en avance
                    const catchUpBoost = Math.min(1.05, 1 + Math.abs(distanceToPlayer) / 300);
                    snail.speed *= catchUpBoost;
                }

                // Ajustement basé sur le temps depuis la dernière victoire du joueur
                if (timeSinceLastWin > 60000) { // 1 minute
                    snail.speed *= 0.995; // Réduction de vitesse plus importante
                }

                // Limite de vitesse minimale plus basse
                snail.speed = Math.max(snail.speed, baseSpeed * 0.7);

                snail.currentImage = snail.speed > 0.3 ? 'enemyRun' : 'enemyIdle';
            } else {
                snail.currentImage = snail.speed > 0.5 ? 'playerRun' : 'playerIdle';
            }
        });
    }

    updateAIDifficulty() {
        this.playerPerformance.totalGames++;
        if (this.snails[0].x >= this.finishLine) {
            this.playerPerformance.wins++;
            this.playerPerformance.lastWinTime = Date.now();
        }

        // Calculer le taux de victoire actuel
        const currentWinRate = this.playerPerformance.wins / this.playerPerformance.totalGames;

        // Ajustements de difficulté moins agressifs
        if (currentWinRate > this.targetWinRate + 0.1) {
            this.aiDifficulty = Math.min(1.4, this.aiDifficulty + 0.02);
        } else if (currentWinRate < this.targetWinRate - 0.1) {
            this.aiDifficulty = Math.max(1.0, this.aiDifficulty - 0.02);
        }

        // Réinitialiser les statistiques après 20 parties
        if (this.playerPerformance.totalGames >= 20) {
            this.playerPerformance = {
                wins: 0,
                totalGames: 0,
                lastWinTime: 0
            };
        }
    }

    update() {
        if (!this.isGameRunning) return;

        // Réduire progressivement la vitesse du joueur plus rapidement
        this.snails[0].speed *= this.speedDecay;

        this.updateAI();

        // Mettre à jour les positions
        this.snails.forEach(snail => {
            snail.x += snail.speed;
            
            // Vérifier si un escargot a gagné
            if (snail.x >= this.finishLine) {
                this.isGameRunning = false;
                this.gameOverScreen.classList.remove('hidden');
                this.winnerText.textContent = snail.isPlayer ? 'Vous avez gagné !' : 'Un adversaire a gagné !';
                this.updateAIDifficulty();
            }
        });

        // Mettre à jour la barre de progression
        this.updateProgressBar();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Dessiner le fond
        this.ctx.fillStyle = '#90EE90';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Dessiner les lignes de course
        this.snails.forEach((snail, index) => {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.setLineDash([5, 15]);
            this.ctx.beginPath();
            this.ctx.moveTo(0, snail.y + snail.height / 2);
            this.ctx.lineTo(this.canvas.width, snail.y + snail.height / 2);
            this.ctx.stroke();
        });

        // Dessiner la ligne d'arrivée et la laitue
        this.snails.forEach((snail, index) => {
            this.ctx.drawImage(this.images.lettuce, this.finishLine, snail.y - 10, 60, 60);
        });

        // Dessiner les escargots
        this.snails.forEach(snail => {
            const img = this.images[snail.currentImage];
            this.ctx.drawImage(img, snail.x, snail.y, snail.width, snail.height);
        });
    }

    animate() {
        if (this.isGameRunning) {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.animate());
        }
    }

    updateProgressBar() {
        const progress = (this.snails[0].x / (this.canvas.width - 100)) * 100;
        this.progressFill.style.width = `${Math.min(100, progress)}%`;
    }

    updateStats() {
        const winRate = this.gamesPlayed > 0 ? (this.gamesWon / this.gamesPlayed * 100).toFixed(1) : 0;
        const avgTime = this.gamesPlayed > 0 ? (this.totalTime / this.gamesPlayed).toFixed(1) : 0;
        const bestTimeStr = this.bestTime === Infinity ? '-' : this.bestTime.toFixed(1);

        document.getElementById('games-played').textContent = this.gamesPlayed;
        document.getElementById('win-rate').textContent = `${winRate}%`;
        document.getElementById('best-time').textContent = bestTimeStr;
        document.getElementById('avg-time').textContent = avgTime;
    }

    showGameOverScreen(winner) {
        this.gameOverScreen.classList.remove('hidden');
        this.winnerText.textContent = winner === 'player' ? 'Vous avez gagné !' : 'Vous avez perdu !';
        this.updateStats();
    }

    restartGame() {
        this.gamesPlayed++;
        this.startGame();
    }
}

// Attendre que toutes les images soient chargées avant de démarrer le jeu
window.addEventListener('load', () => {
    const game = new SnailRaceGame();
}); 