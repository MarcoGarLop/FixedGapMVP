export function showTetrisLoader(container) {
  const bars = [
    { delay: '-1.2s', rotate: '0.0001deg' },
    { delay: '-1.1s', rotate: '30deg' },
    { delay: '-1.0s', rotate: '60deg' },
    { delay: '-0.9s', rotate: '90deg' },
    { delay: '-0.8s', rotate: '120deg' },
    { delay: '-0.7s', rotate: '150deg' },
    { delay: '-0.6s', rotate: '180deg' },
    { delay: '-0.5s', rotate: '210deg' },
    { delay: '-0.4s', rotate: '240deg' },
    { delay: '-0.3s', rotate: '270deg' },
    { delay: '-0.2s', rotate: '300deg' },
    { delay: '-0.1s', rotate: '330deg' },
  ];

  const barsHTML = bars.map(b =>
    `<div class="spinner-bar" style="animation-delay:${b.delay};transform:rotate(${b.rotate}) translate(146%)"></div>`
  ).join('');

  container.innerHTML = `
    <div id="tetris-screen">
      <div class="spinner-wrap">
        <div class="spinner-inner">
          ${barsHTML}
        </div>
      </div>
      <div class="loader-text">
        <h2 class="loader-title">Switching to Physician View</h2>
        <p class="loader-desc">Session complete. Loading the clinical dashboard where your physician monitors your rehabilitation progress.</p>
      </div>
    </div>
  `;

  return () => {};
}
