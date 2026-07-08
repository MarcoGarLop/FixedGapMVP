export function showMenu(container) {
  container.innerHTML = `
    <div id="menu">
      <h1>Rehabilitación</h1>
      <p class="subtitle">Selecciona un ejercicio</p>
      <div class="menu-cards">
        <button class="menu-card" data-game="pastillero">
          <div class="card-icon">💊</div>
          <h2>Pastillero</h2>
          <p>Precisión y pinza digital</p>
          <span class="card-tag">Coordinación fina</span>
        </button>
        <button class="menu-card" data-game="jarra">
          <div class="card-icon">🫗</div>
          <h2>Jarra de Agua</h2>
          <p>Pronación y supinación</p>
          <span class="card-tag">Rotación de muñeca</span>
        </button>
        <button class="menu-card" data-game="interruptores">
          <div class="card-icon">🕹️</div>
          <h2>Interruptores</h2>
          <p>Pinza con dedo corazón y arrastre</p>
          <span class="card-tag">Fuerza de pinza</span>
        </button>
      </div>
      <button class="demo-btn" data-game="demo">▶ Demo (10s por juego)</button>
    </div>
  `;

  return new Promise((resolve) => {
    container.querySelectorAll('[data-game]').forEach(btn => {
      btn.addEventListener('click', () => {
        resolve(btn.dataset.game);
      });
    });
  });
}
