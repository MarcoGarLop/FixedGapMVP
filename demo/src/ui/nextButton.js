// Clay 3D "Next" button used to advance between games during the demo.
// The game keeps running until this button is pressed.

export function createNextButton(label = 'Siguiente') {
  const btn = document.createElement('button');
  btn.id = 'next-game-btn';
  btn.className = 'next-game-btn';
  btn.innerHTML = `
    <span class="next-game-btn-label">${label}</span>
    <span class="next-game-btn-arrow" aria-hidden="true">→</span>
  `;
  document.body.appendChild(btn);
  return btn;
}

export function removeNextButton() {
  const btn = document.getElementById('next-game-btn');
  if (btn) btn.remove();
}

// Convenience: mount the button and resolve a promise when it is clicked,
// OR when a game finishes on its own and dispatches the `demo:next` event.
export function waitForNext(label) {
  return new Promise((resolve) => {
    const btn = createNextButton(label);
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener('demo:next', finish);
      btn.classList.add('is-pressed');
      // small press feedback before resolving
      setTimeout(() => {
        removeNextButton();
        resolve();
      }, 160);
    };

    btn.addEventListener('click', finish, { once: true });
    // A game may complete by itself (its own end-of-session modal) and ask
    // to advance to the next game.
    window.addEventListener('demo:next', finish);
  });
}
