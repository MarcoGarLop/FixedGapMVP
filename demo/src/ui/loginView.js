import gsap from 'gsap';
import { login } from '../database/auth.js';

export function showLogin(container, onLoginSuccess) {
  container.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card">
        <h1 class="auth-title">FixedGap</h1>
        <p class="auth-subtitle">Acceso Clínico</p>
        <form id="login-form">
          <div class="input-group">
            <label for="username">Usuario Operador</label>
            <input type="text" id="username" required autocomplete="username" placeholder="E.g. dr.smith" />
          </div>
          <div class="input-group">
            <label for="password">Contraseña</label>
            <input type="password" id="password" required autocomplete="current-password" placeholder="••••••••" />
          </div>
          <p id="login-error" class="error-message"></p>
          <button type="submit" class="auth-button">
            <span class="btn-text">Iniciar Sesión</span>
            <div class="btn-loader"></div>
          </button>
        </form>
      </div>
    </div>
  `;

  const authScreen = container.querySelector('.auth-screen');
  const authCard = container.querySelector('.auth-card');
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const btn = form.querySelector('.auth-button');

  gsap.fromTo(authScreen, { opacity: 0 }, { opacity: 1, duration: 0.5 });
  gsap.fromTo(authCard, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.1 });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    btn.classList.add('loading');

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    const result = await login(username, password);

    if (result.ok) {
      gsap.to(authCard, { y: -30, opacity: 0, duration: 0.4, ease: 'power2.in' });
      gsap.to(authScreen, { 
        opacity: 0, 
        duration: 0.4, 
        delay: 0.2, 
        onComplete: () => onLoginSuccess(result.user) 
      });
    } else {
      btn.classList.remove('loading');
      errorEl.textContent = result.error || 'Error al iniciar sesión.';
      gsap.fromTo(authCard, { x: -10 }, { x: 0, duration: 0.4, ease: "elastic.out(1, 0.3)" });
    }
  });
}
