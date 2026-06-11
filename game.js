// game.js

let game;
let fontZombie, fontArial;
let imgCache = {};

// Detecta mobile/tablet pelo user agent e pelo tamanho de tela
const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
               || (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);

// Dimensões e estado dos controles virtuais (calculados no setup)
let mobileUI = {
  dpad: { x: 0, y: 0, size: 0 },      // centro e tamanho do D-pad
  attackBtn: { x: 0, y: 0, r: 0 },    // centro e raio do botão de ataque
  activeTouch: null,                   // identificador do toque no D-pad
};

// Carrega imagem com callback de erro — evita que preload trave indefinidamente
function safeLoadImage(key, path) {
  imgCache[key] = loadImage(path, () => {}, () => console.warn("Falhou:", path));
}

function preload() {
  fontZombie = loadFont("fonts/Zombie_Holocaust.ttf", () => {}, () => console.warn("Falhou: Zombie_Holocaust.ttf"));
  fontArial  = loadFont("fonts/Arial.ttf",            () => {}, () => console.warn("Falhou: Arial.ttf"));

  safeLoadImage("intro", "imagens/assets/intro.jpg");
  safeLoadImage("exit",  "imagens/assets/wall/exit.png");
  for (let i = 1; i <= 3; i++) safeLoadImage(`wall${i}`,  `imagens/assets/wall/wall${i}.png`);
  for (let i = 1; i <= 8; i++) safeLoadImage(`floor${i}`, `imagens/assets/floor/${i}.png`);

  safeLoadImage("hamburguer", "imagens/assets/itens/hamburguer.png");
  safeLoadImage("coke",       "imagens/assets/itens/coke.png");

  const breakFrames = [2, 2, 3, 3, 3];
  for (let f = 1; f <= 5; f++)
    for (let i = 1; i <= breakFrames[f - 1]; i++)
      safeLoadImage(`break${f}_${i}`, `imagens/assets/breakable/${f}/${i}.png`);

  for (let i = 1; i <= 6; i++) safeLoadImage(`char_idle_${i}`,   `imagens/char/idle/${i}.png`);
  for (let i = 1; i <= 2; i++) safeLoadImage(`char_attack_${i}`, `imagens/char/attack/${i}.png`);
  for (let i = 1; i <= 2; i++) safeLoadImage(`char_hurt_${i}`,   `imagens/char/hurt/${i}.png`);

  for (let t = 0; t <= 1; t++) {
    for (let i = 1; i <= 6; i++) safeLoadImage(`zombie${t}_idle_${i}`,   `imagens/enemies/zombie${t}/idle/${i}.png`);
    for (let i = 1; i <= 2; i++) safeLoadImage(`zombie${t}_attack_${i}`, `imagens/enemies/zombie${t}/attack/${i}.png`);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(6);
  game = new Game();

  if (isMobile) {
    // D-pad no canto inferior esquerdo
    const pad = Math.min(windowWidth, windowHeight) * 0.22;
    mobileUI.dpad = { x: pad * 0.9, y: windowHeight - pad * 0.9, size: pad };
    // Botão de ataque no canto inferior direito
    const r = pad * 0.38;
    mobileUI.attackBtn = { x: windowWidth - r * 2, y: windowHeight - r * 2, r };
  }
}

function draw() {
  background(0);
  noTint(); // garante que nenhum tint vaza entre frames

  if (game.intro) {
    game.Intro();
    return;
  }
  if (game.endGame) {
    game.GameOver();
    return;
  }
  if (game.levelDone) {
    game.NextLevel();
    return;
  }
  if (game.help) {
    game.ShowHelp();
    return;
  }
  if (game.paused) {
    game.Paused();
    return;
  }

  // ---- estado de jogo ativo ----

  // 1) Lógica dos inimigos — pausada durante o banner de dia
  if (!game.dayMessage) {
    game.TickEnemies();
    if (game.endGame) return;
  }

  // 2) Desenho do mundo com translate isolado em push/pop
  push();
  translate(game.board.offsetX, game.board.offsetY);
  game.board.BackGround(128);
  game.ShowLevel();
  pop();

  // 3) Flash vermelho de dano
  if (game.level.character.hurtTimer > 0) {
    noStroke();
    fill(180, 0, 0, 120);
    rect(0, 0, width, height);
    game.level.character.hurtTimer--;
  }

  // 4) Banner "Dia X" — overlay escuro com texto, some após timer
  if (game.dayMessage) {
    noStroke();
    fill(0, 0, 0, 180);
    rect(0, 0, width, height);
    // "DIA" em fontZombie (sem número, pois a fonte não tem algarismos)
    game.message.setText(fontZombie, 180, CENTER, [139, 0, 0]);
    game.message.show("Dia", width / 2 - 80, height / 2 - 30);
    // número em fontArial ao lado
    game.message.setText(fontArial, 160, LEFT, [139, 0, 0]);
    game.message.show(String(game.day), width / 2 + 60, height / 2 - 30);
    game.message.setText(fontArial, 36, CENTER, [255, 255, 255]);
    game.message.show("Sobreviva e chegue à saída!", width / 2, height / 2 + 110);
    game.message.setText(fontArial, 24, CENTER, [160, 160, 160]);
    game.message.show(isMobile ? "Toque para continuar" : "Clique para continuar", width / 2, height / 2 + 170);
    game._dayMsgTimer--;
    if (game._dayMsgTimer <= 0) game.dayMessage = false;
  }

  game.CheckScore();

  // Desenha controles virtuais no mobile (sempre por cima, fora de qualquer push/pop)
  if (isMobile) drawMobileControls();
}

function keyPressed() {
  if (!game.intro && !game.paused && !game.endGame && !game.help && !game.levelDone && !game.dayMessage) {
    if (keyCode === UP_ARROW || keyCode === DOWN_ARROW || keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) {
      game.MoveCharacter(keyCode);
    }
    if (key === 'A' || key === 'a') {
      game.CharAttack();
    }
  }
  if (key === 'R' || key === 'r') game.Restart();
  if (keyCode === 112) game.help = true;
}

function mousePressed() {
  if (isMobile) return; // mobile usa touchStarted, não mousePressed
  if (game.intro) {
    game.intro = false;
  } else if (game.help) {
    game.help = false;
  } else if (game.endGame) {
    game.Restart();
    game.intro = true;
  } else if (game.dayMessage) {
    game.dayMessage = false;
  } else {
    game.paused = !game.paused;
  }
}

// -------------------- Controles Mobile --------------------

function drawMobileControls() {
  if (game.intro || game.endGame || game.help || game.paused || game.dayMessage) return;

  const { dpad, attackBtn } = mobileUI;
  const s = dpad.size;
  const btn = s * 0.28; // tamanho de cada seta

  noStroke();

  // Fundo do D-pad (disco semitransparente)
  fill(0, 0, 0, 100);
  ellipse(dpad.x, dpad.y, s * 1.1, s * 1.1);

  // Setas do D-pad
  fill(255, 255, 255, 180);
  // Cima
  triangle(
    dpad.x,          dpad.y - s * 0.42,
    dpad.x - btn*0.6, dpad.y - s * 0.15,
    dpad.x + btn*0.6, dpad.y - s * 0.15
  );
  // Baixo
  triangle(
    dpad.x,          dpad.y + s * 0.42,
    dpad.x - btn*0.6, dpad.y + s * 0.15,
    dpad.x + btn*0.6, dpad.y + s * 0.15
  );
  // Esquerda
  triangle(
    dpad.x - s * 0.42, dpad.y,
    dpad.x - s * 0.15, dpad.y - btn*0.6,
    dpad.x - s * 0.15, dpad.y + btn*0.6
  );
  // Direita
  triangle(
    dpad.x + s * 0.42, dpad.y,
    dpad.x + s * 0.15, dpad.y - btn*0.6,
    dpad.x + s * 0.15, dpad.y + btn*0.6
  );

  // Botão de ataque
  fill(200, 50, 50, 200);
  ellipse(attackBtn.x, attackBtn.y, attackBtn.r * 2, attackBtn.r * 2);
  fill(255, 255, 255, 220);
  textFont(fontArial, attackBtn.r * 0.7);
  textAlign(CENTER, CENTER);
  text("ATK", attackBtn.x, attackBtn.y);
}

// Converte toque no D-pad em keyCode equivalente
function dpadDirection(tx, ty) {
  const { dpad } = mobileUI;
  const dx = tx - dpad.x;
  const dy = ty - dpad.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < dpad.size * 0.12) return null; // zona morta central
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? RIGHT_ARROW : LEFT_ARROW;
  return dy > 0 ? DOWN_ARROW : UP_ARROW;
}

function isOnDpad(tx, ty) {
  const { dpad } = mobileUI;
  const dx = tx - dpad.x, dy = ty - dpad.y;
  return Math.sqrt(dx*dx + dy*dy) <= dpad.size * 0.55;
}

function isOnAttack(tx, ty) {
  const { attackBtn } = mobileUI;
  const dx = tx - attackBtn.x, dy = ty - attackBtn.y;
  return Math.sqrt(dx*dx + dy*dy) <= attackBtn.r;
}

// Processa um toque como interação de jogo (telas de intro, pausa, etc.)
function handleGameTouch(tx, ty) {
  if (game.intro) {
    game.intro = false;
    return;
  }
  if (game.help) {
    game.help = false;
    return;
  }
  if (game.endGame) {
    game.Restart();
    game.intro = true;
    return;
  }
  if (game.dayMessage) {
    game.dayMessage = false;
    return;
  }
  // Toque fora dos controles → pausa
  if (!isOnDpad(tx, ty) && !isOnAttack(tx, ty)) {
    game.paused = !game.paused;
  }
}

function touchStarted() {
  if (!isMobile) return true;

  for (let t of touches) {
    const tx = t.x, ty = t.y;

    // Telas de estado (intro, gameover etc.) — qualquer toque avança
    if (game.intro || game.help || game.endGame || game.dayMessage || game.paused) {
      handleGameTouch(tx, ty);
      return false;
    }

    if (isOnAttack(tx, ty)) {
      if (!game.paused && !game.dayMessage) game.CharAttack();
    } else if (isOnDpad(tx, ty)) {
      // Registra toque no D-pad e processa direção imediatamente
      mobileUI.activeTouch = t.id;
      const dir = dpadDirection(tx, ty);
      if (dir && !game.paused && !game.dayMessage) game.MoveCharacter(dir);
    } else {
      handleGameTouch(tx, ty);
    }
  }
  return false; // previne scroll
}

function touchMoved() {
  if (!isMobile) return true;
  // Permite deslizar no D-pad para mudar direção continuamente
  for (let t of touches) {
    if (t.id === mobileUI.activeTouch || isOnDpad(t.x, t.y)) {
      // throttle: só move se o frameCount avançou (evita spam)
      const dir = dpadDirection(t.x, t.y);
      if (dir && !game.paused && !game.dayMessage && frameCount % 2 === 0) {
        game.MoveCharacter(dir);
      }
    }
  }
  return false;
}

function touchEnded() {
  if (!isMobile) return true;
  mobileUI.activeTouch = null;
  return false;
}

// -------------------- Classes --------------------

// Desenha um sprite com flip horizontal opcional
// facingLeft=true espelha o sprite no eixo X sem precisar de sprite extra
function drawSprite(img, x, y, size, facingLeft) {
  if (!img) return;
  push();
  if (facingLeft) {
    scale(-1, 1);
    image(img, -(x + size), y);
  } else {
    image(img, x, y);
  }
  pop();
}

class Level {
  constructor(numero, numItens, numEnemies, board) {
    this.numero      = numero;
    this.numItens    = numItens;
    this.numEnemies  = numEnemies;
    this.numBreakables = board.cols * 2;
    this.board       = board;
    this.itens       = [];
    this.enemies     = [];
    this.breakables  = [];

    this.character = new Character(2, this.board.rows - 3, 6, 2, 2, this.board.pixelSize);
    this.board.boardMatrix[this.board.rows - 3][2] = 2;

    let i = 0;
    while (i < this.numItens) {
      let x = int(random(3, board.cols - 2));
      let y = int(random(2, board.rows - 2));
      if (board.boardMatrix[y][x] === 0) {
        board.boardMatrix[y][x] = 3;
        let tipo = random() > 0.5 ? "hamburguer" : "coke";
        let pts  = tipo === "hamburguer" ? 20 : 10;
        this.itens.push(new Consumable(x, y, board.pixelSize, pts, tipo));
        i++;
      }
    }

    const breakFrames = [2, 2, 3, 3, 3];
    i = 0;
    while (i < this.numBreakables) {
      let x = int(random(2, board.cols - 2));
      let y = int(random(2, board.rows - 2));
      if (board.boardMatrix[y][x] === 0) {
        board.boardMatrix[y][x] = 5;
        let folder = int(random(1, 6));
        let frames = breakFrames[folder - 1];
        this.breakables.push(new Breakable(x, y, board.pixelSize, frames, folder));
        i++;
      }
    }

    i = 0;
    while (i < this.numEnemies) {
      let x = int(random(4, board.cols - 2));
      let y = int(random(2, board.rows - 2));
      if (board.boardMatrix[y][x] === 0) {
        board.boardMatrix[y][x] = 4;
        let type = int(random(0, 2));
        this.enemies.push(new Enemie(x, y, 6, 2, type, board.pixelSize));
        i++;
      }
    }
  }

  getConsumable(x, y) { return this.itens.find(it => it.posX === x && it.posY === y); }
  getEnemie(x, y)     { return this.enemies.find(e => e.posX === x && e.posY === y); }
  getBreakable(x, y)  { return this.breakables.find(b => b.posX === x && b.posY === y); }
}

class Base {
  constructor(x, y, pixelSize) {
    this.posX = x;
    this.posY = y;
    this.pixelSize = pixelSize;
  }
}

class TextControl {
  constructor(style, size, align, color) { this.setText(style, size, align, color); }

  setText(style, size, align, color) {
    this.size  = size;
    this.align = align;
    this.color = color;
    textFont(style, this.size);
    textAlign(this.align);
    fill(...this.color);
  }

  show(texto, x, y) {
    fill(...this.color);
    textAlign(this.align);
    text(texto, x, y);
  }
}

class GameBoard {
  constructor(pixelSize) {
    this.pixelSize = pixelSize;
    this.cols   = floor(windowWidth  / pixelSize);
    this.rows   = floor(windowHeight / pixelSize);
    this.width  = this.cols * pixelSize;
    this.height = this.rows * pixelSize;
    this.offsetX = floor((windowWidth  - this.width)  / 2) - 1;
    this.offsetY = floor((windowHeight - this.height) / 2) - 1;

    this.boardMatrix = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    this.fundo = imgCache["intro"];
    this.saida = imgCache["exit"];
    this.wallSprites  = [];
    this.floorSprites = [];

    let mur = 0;
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (i === 0 || j === 0 || i === this.rows - 1 || j === this.cols - 1) {
          this.boardMatrix[i][j] = 1;
          mur++;
        }
      }
    }

    for (let i = 0; i < mur; i++)
      this.wallSprites.push(imgCache[`wall${int(random(1, 4))}`]);

    let tam = (this.cols - 1) * (this.rows - 1);
    for (let i = 0; i < tam; i++)
      this.floorSprites.push(imgCache[`floor${int(random(1, 9))}`]);
  }

  BackGround(value) {
    if (value === 0) {
      image(this.fundo, 0, 0, width, height);
    } else {
      background(value);
      let z = 0, y = 0;
      for (let i = 0; i < this.rows; i++) {
        for (let j = 0; j < this.cols; j++) {
          if (i === 0 || j === 0 || i === this.rows - 1 || j === this.cols - 1) {
            image(this.wallSprites[z++], j * this.pixelSize, i * this.pixelSize);
          } else {
            image(this.floorSprites[y++], j * this.pixelSize, i * this.pixelSize);
          }
        }
      }
      image(this.saida, (this.cols - 1) * this.pixelSize, 2 * this.pixelSize);
    }
  }
}

class Game {
  constructor() {
    this.board      = new GameBoard(64);
    this.intro      = true;
    this.paused     = false;
    this.endGame    = false;
    this.levelDone  = false;
    this.help       = false;
    this.Score      = 200;
    this.day        = 1;          // contador de dias sobrevividos
    this.dayMessage = true;       // exibe "Dia X" no início de cada dia
    this._dayMsgTimer = 90;       // duração em ms (90 * ~166ms ≈ 15s a 6fps)

    this.message = new TextControl(fontZombie, 32, CENTER, [255, 0, 0]);
    this.level   = new Level(1, this._itensForDay(), this._enemiesForDay(), this.board);

    this._lastEnemyMove = millis();
    this._enemyInterval = 800;
  }

  // Dificuldade escala com os dias
  _itensForDay()   { return 3 + this.day; }
  _enemiesForDay() { return 3 + this.day; }

  Restart() {
    this.help       = false;
    this.intro      = false;
    this.paused     = false;
    this.endGame    = false;
    this.levelDone  = false;
    this.Score      = 200;
    this.day        = 1;
    this.dayMessage = true;
    this._dayMsgTimer = 90;
    this.board      = new GameBoard(64);
    this.level      = new Level(1, this._itensForDay(), this._enemiesForDay(), this.board);
    this._lastEnemyMove = millis();
  }

  Intro() {
    this.board.BackGround(0);
    this.message.setText(fontZombie, 150, CENTER, [139, 0, 0]);
    this.message.show("ZUMBIS",      width / 2, 150);
    this.message.show("COMERAM MEU", width / 2, 325);
    this.message.show("HAMBURGUER",  width / 2, 500);
    this.message.setText(fontArial, 40, CENTER, [255, 255, 255]);
    this.message.show(isMobile ? "Toque para começar!" : "Clique para começar!", width / 2, 650);
    this.message.show("Desenvolvido por José Antonio Gallo Junior", width / 2, 700);
  }

  ShowHelp() {
    this.board.BackGround(0);
    this.message.setText(fontZombie, 150, CENTER, [139, 0, 0]);
    this.message.show("ajuda", width / 2, 200);
    this.message.setText(fontArial, 40, CENTER, [255, 255, 255]);
    this.message.show("Atravesse o cenário e chegue à Saída",       width / 2, height / 2);
    this.message.show("Use as setas para movimentar o personagem",  width / 2, height / 2 + 50);
    this.message.show("Colete os lanches pelo caminho",             width / 2, height / 2 + 100);
    this.message.show("Se a comida acabar você morre",              width / 2, height / 2 + 150);
    this.message.show("Os obstáculos são quebráveis",               width / 2, height / 2 + 200);
    this.message.show("Desenvolvido por José Antonio Gallo Junior", width / 2, height / 2 + 250);
  }

  NextLevel() {
    // Avança para o próximo dia — Score é mantido (não reseta entre dias)
    this.day++;
    this.levelDone  = false;
    this.dayMessage = true;
    this._dayMsgTimer = 90;
    this.board      = new GameBoard(64);
    this.level      = new Level(this.day, this._itensForDay(), this._enemiesForDay(), this.board);
    this._lastEnemyMove = millis();
  }

  GameOver() {
    this.board.BackGround(0);
    this.message.setText(fontZombie, 160, CENTER, [139, 0, 0]);
    this.message.show("Você Morreu", width / 2, height / 2 - 120);
    this.message.show("De Fome",     width / 2, height / 2 + 60);
    this.message.setText(fontArial, 44, CENTER, [255, 220, 0]);
    let diasTxt = this.day === 1 ? "Você sobreviveu apenas 1 dia." : `Você sobreviveu ${this.day} dias.`;
    this.message.show(diasTxt, width / 2, height / 2 + 160);
    this.message.setText(fontArial, 32, CENTER, [255, 255, 255]);
    this.message.show("Clique para voltar ao início", width / 2, height / 2 + 230);
  }

  Paused() {
    this.board.BackGround(0);
    this.message.setText(fontZombie, 150, CENTER, [139, 0, 0]);
    this.message.show("Jogo Pausado", width / 2, height / 2);
    this.message.setText(fontArial, 40, CENTER, [255, 255, 255]);
    this.message.show(isMobile ? "Toque para continuar!" : "Clique para continuar!", width / 2, 650);
  }

  // Tick de lógica dos inimigos — chamado antes de qualquer desenho
  TickEnemies() {
    if (millis() - this._lastEnemyMove >= this._enemyInterval) {
      this._moveEnemiesAuto();
      this._lastEnemyMove = millis();
    }
  }

  ShowLevel() {
    for (let b of this.level.breakables) b.draw();
    for (let it of this.level.itens)     it.draw();
    for (let e of this.level.enemies)    e.draw();
    this.level.character.draw();

    // HUD — desenhado dentro do translate do board, coords relativas ao board
    // Linha superior: Dia • Comida Restante
    this.message.setText(fontArial, 28, LEFT, [255, 220, 0]);
    this.message.show("Dia " + this.day + "  •  Comida Restante: " + this.Score, 20, 40);
    // Linha inferior: controles
    this.message.setText(fontArial, 24, LEFT, [200, 200, 200]);
    this.message.show("F1 - Ajuda        ←↑↓→ - Movimentar       A - Atacar      Mouse - Pausa", 20, this.board.height - 10);
  }

  MoveCharacter(keyCode) {
    const x = this.level.character.posX;
    const y = this.level.character.posY;
    let newX = x, newY = y;

    if (keyCode === LEFT_ARROW)  newX--;
    if (keyCode === RIGHT_ARROW) newX++;
    if (keyCode === UP_ARROW)    newY--;
    if (keyCode === DOWN_ARROW)  newY++;

    // Saída
    if (newX === this.board.cols - 1 && newY === 2) {
      this.board.boardMatrix[y][x] = 0;
      this.level.character.move(newX, newY);
      this.levelDone = true;
      return;
    }

    // Garante que a célula atual do jogador está correta antes de mover
    this.board.boardMatrix[y][x] = 2;
    const destino = this.board.boardMatrix[newY][newX];

    if (destino === 0) {
      this.board.boardMatrix[y][x] = 0;
      this.level.character.move(newX, newY);
      this.board.boardMatrix[newY][newX] = 2;
      this.Score--;
    } else if (destino === 3) {
      const item = this.level.getConsumable(newX, newY);
      if (item) this.Score += item.eat();
      this.board.boardMatrix[y][x] = 0;
      this.level.character.move(newX, newY);
      this.board.boardMatrix[newY][newX] = 2;
    } else if (destino === 4) {
      // Tentou andar em cima de um inimigo → leva dano, não move
      this._playerTakesHit();
    }
    // Destino 1 (parede) ou 5 (quebrável): ignora movimento
  }

  CharAttack() {
    const x  = this.level.character.posX;
    const y  = this.level.character.posY;
    // Ataca na direção que o personagem está virado
    const newX = this.level.character.facingLeft ? x - 1 : x + 1;
    const newY = y;
    const target = this.board.boardMatrix[newY] && this.board.boardMatrix[newY][newX];

    this.level.character.setAttacking();
    this.Score -= 2;

    if (target === 4) {
      const e = this.level.getEnemie(newX, newY);
      if (e && e.takeDamage()) {
        this.level.enemies = this.level.enemies.filter(en => en !== e);
        this.board.boardMatrix[newY][newX] = 0;
        this.Score += 3;
      }
    } else if (target === 5) {
      const b = this.level.getBreakable(newX, newY);
      if (b && b.breakBlock()) {
        this.board.boardMatrix[newY][newX] = 0;
        this.level.breakables = this.level.breakables.filter(br => br !== b);
      }
    }
  }

  CheckScore() {
    if (this.Score <= 0) this.endGame = true;
  }

  _playerTakesHit() {
    this.Score -= 10;
    this.level.character.setHurt();
    if (this.Score <= 0) this.endGame = true;
  }

  // Movimentação autônoma: chamada por timer, independente do teclado
  _moveEnemiesAuto() {
    for (let enemy of this.level.enemies) {
      if (this.endGame) break; // para o loop se o jogador morreu no meio
      this._moveOneEnemy(enemy);
    }
  }

  // Movimentação também acionada pelo movimento do jogador (reatividade)
  _moveEnemiesReactive() {
    for (let enemy of this.level.enemies) {
      // Só reage se estiver perto (distância de Chebyshev <= 5)
      const dx = Math.abs(this.level.character.posX - enemy.posX);
      const dy = Math.abs(this.level.character.posY - enemy.posY);
      if (Math.max(dx, dy) <= 5) {
        this._moveOneEnemy(enemy);
      }
    }
  }

  _moveOneEnemy(enemy) {
    const charX = this.level.character.posX;
    const charY = this.level.character.posY;
    const dx = charX - enemy.posX;
    const dy = charY - enemy.posY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Adjacente → ataca (não se move, só aplica dano)
    const isAdjacent = (absDx === 1 && dy === 0) || (absDy === 1 && dx === 0);
    if (isAdjacent) {
      enemy.setAttacking();
      this._playerTakesHit();
      return;
    }

    let moves = this._candidateMoves(dx, dy, absDx, absDy);

    for (let [nx, ny] of moves) {
      let newX = enemy.posX + nx;
      let newY = enemy.posY + ny;

      if (newX < 0 || newY < 0 || newX >= this.board.cols || newY >= this.board.rows) continue;

      const destino = this.board.boardMatrix[newY][newX];

      // Só move para célula estritamente vazia — nunca sobrescreve o jogador (2)
      if (destino === 0) {
        this.board.boardMatrix[enemy.posY][enemy.posX] = 0;
        enemy.move(newX, newY);
        this.board.boardMatrix[newY][newX] = 4;
        // Garante que a posição real do jogador continua marcada como 2
        // (defesa contra estados inconsistentes de tick anterior)
        this.board.boardMatrix[charY][charX] = 2;
        break;
      }
    }
  }

  // Retorna lista de deltas [dx,dy] priorizando direção ao jogador,
  // com fallbacks perpendiculares para contornar obstáculos
  _candidateMoves(dx, dy, absDx, absDy) {
    let primary, perpA, perpB;

    if (absDx >= absDy) {
      primary = [dx > 0 ? 1 : -1, 0];
      perpA   = [0, dy >= 0 ? 1 : -1];
      perpB   = [0, dy >= 0 ? -1 : 1];
    } else {
      primary = [0, dy > 0 ? 1 : -1];
      perpA   = [dx >= 0 ? 1 : -1, 0];
      perpB   = [dx >= 0 ? -1 : 1, 0];
    }

    // 20% de chance de tentar perpendicular primeiro (comportamento menos previsível)
    if (random() < 0.2) {
      return [perpA, primary, perpB];
    }
    return [primary, perpA, perpB];
  }
}

// -------------------- Character --------------------

class Character extends Base {
  constructor(x, y, framesIdle, framesAttack, framesHurt, pixelSize) {
    super(x, y, pixelSize);
    this.numFramesIdle   = framesIdle;
    this.numFramesAttack = framesAttack;
    this.numFramesHurt   = framesHurt;
    this.currentFrame    = 0;
    this.hurtTimer       = 0;
    this.attackTimer     = 0;
    this.facingLeft      = false; // sprite virado para esquerda?

    this.idleSprites   = Array.from({ length: framesIdle },   (_, i) => imgCache[`char_idle_${i + 1}`]);
    this.attackSprites = Array.from({ length: framesAttack }, (_, i) => imgCache[`char_attack_${i + 1}`]);
    this.hurtSprites   = Array.from({ length: framesHurt },   (_, i) => imgCache[`char_hurt_${i + 1}`]);
  }

  move(x, y) {
    if (x !== this.posX) this.facingLeft = x < this.posX;
    this.posX = x;
    this.posY = y;
  }

  setHurt()      { this.hurtTimer = this.numFramesHurt; }
  setAttacking() { this.attackTimer = 2; }

  draw() {
    this.currentFrame = (this.currentFrame + 1) % this.numFramesIdle;
    const px = this.posX * this.pixelSize;
    const py = this.posY * this.pixelSize;

    if (this.attackTimer > 0) {
      let f = (this.numFramesAttack - this.attackTimer % this.numFramesAttack) % this.numFramesAttack;
      drawSprite(this.attackSprites[f], px, py, this.pixelSize, this.facingLeft);
      this.attackTimer--;
    } else if (this.hurtTimer > 0) {
      let f = (this.numFramesHurt - this.hurtTimer % this.numFramesHurt) % this.numFramesHurt;
      drawSprite(this.hurtSprites[f], px, py, this.pixelSize, this.facingLeft);
    } else {
      drawSprite(this.idleSprites[this.currentFrame], px, py, this.pixelSize, this.facingLeft);
    }
  }
}

// -------------------- Enemie --------------------

class Enemie extends Base {
  constructor(x, y, framesIdle, framesAttack, type, pixelSize) {
    super(x, y, pixelSize);
    this.numFramesIdle   = framesIdle;
    this.numFramesAttack = framesAttack;
    this.currentFrame    = 0;
    this.hp              = 3;
    this.flashTimer      = 0;
    this.attackTimer     = 0;
    this.facingLeft      = true;  // sprite original olha para a esquerda; sem flip ao ir para esquerda
    this.type            = type;

    this.idleSprites   = Array.from({ length: framesIdle },   (_, i) => imgCache[`zombie${type}_idle_${i + 1}`]);
    this.attackSprites = Array.from({ length: framesAttack }, (_, i) => imgCache[`zombie${type}_attack_${i + 1}`]);
  }

  move(x, y) {
    if (x !== this.posX) this.facingLeft = x < this.posX;
    this.posX = x;
    this.posY = y;
  }

  setAttacking() { this.attackTimer = 2; }

  draw() {
    this.currentFrame = (this.currentFrame + 1) % this.numFramesIdle;
    const px = this.posX * this.pixelSize;
    const py = this.posY * this.pixelSize;

    let spriteImg;
    if (this.attackTimer > 0) {
      let f = (this.numFramesAttack - this.attackTimer % this.numFramesAttack) % this.numFramesAttack;
      spriteImg = this.attackSprites[f];
      tint(255, 180, 0);
      this.attackTimer--;
    } else if (this.flashTimer > 0) {
      spriteImg = this.idleSprites[this.currentFrame];
      tint(255, 80, 80);
      this.flashTimer--;
    } else {
      spriteImg = this.idleSprites[this.currentFrame];
      noTint();
    }

    // Sprite do zumbi olha para esquerda por padrão:
    // flip quando NÃO está indo para esquerda (ou seja, vai para direita)
    drawSprite(spriteImg, px, py, this.pixelSize, !this.facingLeft);

    noTint();

    // Barra de vida — posição fixa no tile, não afetada pelo flip
    noStroke();
    fill(255, 0, 0);
    rect(px, py - 10, this.pixelSize, 5);
    fill(0, 255, 0);
    rect(px, py - 10, this.pixelSize * (this.hp / 3), 5);
  }

  takeDamage() {
    this.hp--;
    this.flashTimer = 3;
    return this.hp <= 0;
  }
}

// -------------------- Consumable --------------------

class Consumable extends Base {
  constructor(x, y, pixelSize, points, tipo) {
    super(x, y, pixelSize);
    this.status = 1;
    this.points = points;
    this.imagem = imgCache[tipo];
  }

  draw() {
    if (this.status === 1)
      image(this.imagem, this.posX * this.pixelSize, this.posY * this.pixelSize);
  }

  eat() { this.status = 0; return this.points; }
}

// -------------------- Breakable --------------------

class Breakable extends Base {
  constructor(x, y, pixelSize, numFrames, folder) {
    super(x, y, pixelSize);
    this.status    = 1;
    this.numFrames = numFrames;
    this.images    = Array.from({ length: numFrames }, (_, i) => imgCache[`break${folder}_${i + 1}`]);
  }

  draw() {
    if (this.status <= this.numFrames)
      image(this.images[this.status - 1], this.posX * this.pixelSize, this.posY * this.pixelSize);
  }

  breakBlock() { this.status++; return this.status > this.numFrames; }
}
