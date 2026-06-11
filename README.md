# 🧟 Zombies Ate My Hamburguer

> Um jogo de sobrevivência em grade desenvolvido com **p5.js**.  
> Sobreviva o maior número de dias possível enquanto zumbis tentam roubar seu jantar.

---

## 🎮 Como Jogar

Ao abrir o jogo, clique na tela de introdução para começar. Um banner indicará o **Dia 1** — clique novamente para entrar em ação.

Seu objetivo é atravessar o cenário e **chegar à saída** (sinalizada pelo letreiro EXIT no canto direito do mapa). Cada dia que você sobrevive, um novo mapa é gerado com mais inimigos e mais itens.

---

## 🕹️ Controles

| Tecla | Ação |
|-------|------|
| `←` `↑` `↓` `→` | Movimentar o personagem |
| `A` | Atacar (atinge a célula à direita do personagem) |
| `Mouse` | Pausar / Retomar o jogo |
| `F1` | Exibir tela de ajuda |
| `R` | Reiniciar o jogo a qualquer momento |

---

## 🍔 Sistema de Comida

A **Comida Restante** é sua barra de vida e de tempo ao mesmo tempo — ela aparece no topo da tela e nunca reseta entre os dias.

| Ação | Efeito na Comida |
|------|-----------------|
| Mover um passo | −1 |
| Atacar | −2 |
| Levar golpe de zumbi | −10 |
| Coletar hamburguer | +20 |
| Coletar refrigerante | +10 |
| Matar um zumbi | +15 |

Se a comida chegar a **zero**, você morre de fome.

---

## 🧟 Inimigos

Existem dois tipos de zumbi, ambos com **3 pontos de vida**. Eles se movem de forma autônoma a cada 800ms, independente da sua movimentação. Quanto mais próximos estiverem, mais agressivos ficam.

- Zumbis **atacam ao entrar na célula adjacente** ao jogador.
- Ao levar dano, ficam com o sprite em vermelho brevemente.
- A **barra de vida verde** sobre cada zumbi indica o HP restante.

---

## 💀 Game Over

Quando a comida acaba, o jogo exibe a tela de morte com o número de dias que você sobreviveu. Clique para voltar à tela inicial e tentar novamente.

---

## 📅 Progressão por Dias

Cada dia que você completa gera um mapa novo com dificuldade crescente:

| Dia | Itens no mapa | Zumbis |
|-----|--------------|--------|
| 1 | 4 | 4 |
| 2 | 5 | 5 |
| 3 | 6 | 6 |
| N | 3 + N | 3 + N |

O score de comida **não reseta entre os dias** — chegue à saída com bastante comida para ter fôlego nos próximos.

---

## 🗺️ Elementos do Mapa

| Elemento | Descrição |
|----------|-----------|
| 🧱 Paredes | Bordas intransponíveis do mapa |
| 🪨 Obstáculos | Blocos quebráveis — destrua com o ataque (`A`) |
| 🍔 Hamburguer | Recarrega +20 de comida |
| 🥤 Refrigerante | Recarrega +10 de comida |
| 🚪 EXIT | Saída — chegue até ela para avançar ao próximo dia |

---

## ⚙️ Tecnologias

- **p5.js** — engine de renderização e loop de jogo
- **JavaScript** — lógica do jogo (ES6+, classes, módulos)
- Sprites em pixel art, fontes customizadas e assets de tileset

---

## 🚀 Como Executar

O jogo usa `fetch` para carregar imagens e fontes, então **não funciona ao abrir o `index.html` diretamente no navegador** (bloqueio de CORS do protocolo `file://`).

Use um servidor local:

**VS Code — Live Server** (recomendado)
> Clique com botão direito em `index.html` → *Open with Live Server*

**Python**
```bash
python -m http.server 8000
# Acesse: http://localhost:8000
```

**Node.js**
```bash
npx serve .
```

---

## 👨‍💻 Desenvolvido por

**José Antonio Gallo Junior**