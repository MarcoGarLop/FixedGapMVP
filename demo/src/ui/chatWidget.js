import gsap from 'gsap';
import { getCurrentUser } from '../database/auth.js';
import {
  loadConversations,
  loadMessages,
  sendMessage,
  createConversation,
  getOperatorsList,
  subscribeToMessages,
  hideConversation,
  unhideConversation,
} from '../database/chat.js';

// --- Singleton state (survives re-init) ---
let initialized = false;
let currentUser = null;
let conversations = [];
let activeConvId = null;
let activeConvType = null;

const VIEW = { LIST: 'LIST', CHAT: 'CHAT', NEW: 'NEW', GROUP: 'GROUP' };
let currentView = VIEW.LIST;

// --- DOM refs (set once on first init) ---
let $widget, $fab, $drawer, $badge;
let $closeBtn, $backBtn, $title;
let $viewList, $viewChat, $viewNew, $viewGroup;
let $convContainer, $msgsContainer, $opsContainer, $groupOpsContainer;
let $chatForm, $chatInput;
let $groupNameInput, $createGroupBtn;
let isOpen = false;

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function fmtName(raw) {
  if (!raw) return 'Desconocido';
  return raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function timeAgo(iso) {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export async function initChatWidget(container) {
  // Prevent double-init: if already mounted, just make sure it's visible
  if (initialized) {
    if ($widget && !container.contains($widget)) {
      container.appendChild($widget);
    }
    return;
  }

  currentUser = await getCurrentUser();
  if (!currentUser) return;

  // --- Build DOM ---
  const wrapper = document.createElement('div');
  wrapper.innerHTML = buildHTML();
  const widgetEl = wrapper.firstElementChild;
  container.appendChild(widgetEl);

  // --- Cache refs ---
  $widget = widgetEl;
  $fab = $widget.querySelector('#chat-main-fab');
  $drawer = $widget.querySelector('#chat-drawer');
  $badge = $widget.querySelector('#chat-badge');
  $closeBtn = $widget.querySelector('#chat-close-btn');
  $backBtn = $widget.querySelector('#chat-back-btn');
  $title = $widget.querySelector('#chat-title');
  $viewList = $widget.querySelector('#view-list');
  $viewChat = $widget.querySelector('#view-chat');
  $viewNew = $widget.querySelector('#view-new');
  $viewGroup = $widget.querySelector('#view-new-group');
  $convContainer = $widget.querySelector('#conversations-container');
  $msgsContainer = $widget.querySelector('#messages-container');
  $opsContainer = $widget.querySelector('#operators-container');
  $groupOpsContainer = $widget.querySelector('#group-operators-container');
  $chatForm = $widget.querySelector('#chat-input-form');
  $chatInput = $widget.querySelector('#chat-input');
  $groupNameInput = $widget.querySelector('#new-group-name');
  $createGroupBtn = $widget.querySelector('#create-group-btn');

  // --- Wire Events (once) ---
  $fab.addEventListener('click', () => { $badge.classList.add('hidden'); open(); });
  $closeBtn.addEventListener('click', close);
  $backBtn.addEventListener('click', goBack);
  $widget.querySelector('#new-chat-btn').addEventListener('click', showNewChat);
  $widget.querySelector('#create-group-nav-btn').addEventListener('click', showGroupForm);
  $createGroupBtn.addEventListener('click', handleCreateGroup);
  $chatForm.addEventListener('submit', handleSend);
  $groupNameInput.addEventListener('input', validateGroupForm);

  // --- Realtime ---
  subscribeToMessages(onRealtimeMessage);

  initialized = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAWER TOGGLE
// ─────────────────────────────────────────────────────────────────────────────

function open() {
  isOpen = true;
  $widget.classList.remove('closed');
  gsap.fromTo($drawer, { y: 20, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out' });
  gsap.to($fab, { scale: 0, duration: 0.2 });
  if (currentView === VIEW.LIST) refreshList();
}

function close() {
  isOpen = false;
  gsap.to($drawer, { y: 20, opacity: 0, scale: 0.95, duration: 0.25, onComplete: () => {
    $widget.classList.add('closed');
    gsap.to($fab, { scale: 1, duration: 0.3, ease: 'back.out(1.5)' });
  }});
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW SWITCHING
// ─────────────────────────────────────────────────────────────────────────────

function switchTo(view, titleText) {
  currentView = view;
  [$viewList, $viewChat, $viewNew, $viewGroup].forEach(v => v.classList.remove('active'));
  $backBtn.classList.toggle('hidden', view === VIEW.LIST);
  $title.textContent = titleText || 'Mensajes';

  const map = { [VIEW.LIST]: $viewList, [VIEW.CHAT]: $viewChat, [VIEW.NEW]: $viewNew, [VIEW.GROUP]: $viewGroup };
  map[view].classList.add('active');
}

function goBack() {
  if (currentView === VIEW.CHAT) {
    activeConvId = null;
    activeConvType = null;
    switchTo(VIEW.LIST, 'Mensajes');
    refreshList();
  } else if (currentView === VIEW.NEW) {
    switchTo(VIEW.LIST, 'Mensajes');
  } else if (currentView === VIEW.GROUP) {
    switchTo(VIEW.NEW, 'Nuevo chat');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION LIST
// ─────────────────────────────────────────────────────────────────────────────

async function refreshList() {
  $convContainer.innerHTML = '<div class="chat-loader">Cargando...</div>';
  conversations = await loadConversations();

  const visible = conversations.filter(c => {
    const me = c.conversation_participants.find(p => p.operator_id === currentUser.id);
    return me && !me.hidden;
  });

  if (!visible.length) {
    $convContainer.innerHTML = '<div class="empty-msg">No tienes conversaciones.<br><small>Pulsa + para iniciar una.</small></div>';
    return;
  }

  $convContainer.innerHTML = visible.map(c => {
    const name = convName(c);
    const preview = c.lastMessage ? esc(c.lastMessage.content).slice(0, 35) : '';
    const time = c.lastMessage ? timeAgo(c.lastMessage.created_at) : '';
    const isGroup = c.type === 'group';

    return `
      <div class="conv-item" data-id="${c.id}" data-type="${c.type}">
        <div class="conv-avatar${isGroup ? ' group' : ''}">${name.charAt(0).toUpperCase()}</div>
        <div class="conv-details">
          <div class="conv-name">${esc(name)}</div>
          ${preview ? `<div class="conv-preview">${preview}</div>` : ''}
        </div>
        ${time ? `<div class="conv-time">${time}</div>` : ''}
        <button class="icon-button conv-hide-btn" aria-label="Ocultar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        </button>
      </div>
    `;
  }).join('');

  $convContainer.querySelectorAll('.conv-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.conv-hide-btn')) return;
      const conv = visible.find(c => c.id === el.dataset.id);
      openConversation(el.dataset.id, convName(conv), el.dataset.type);
    });
    el.querySelector('.conv-hide-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      await hideConversation(el.dataset.id);
      el.remove();
      if (!$convContainer.querySelector('.conv-item')) {
        $convContainer.innerHTML = '<div class="empty-msg">No tienes conversaciones.</div>';
      }
    });
  });
}

function convName(c) {
  if (c.type === 'group') return c.name || 'Grupo';
  const other = c.conversation_participants.find(p => p.operator_id !== currentUser.id);
  return other?.operators ? fmtName(other.operators.display_name || other.operators.username) : 'Chat';
}

// ─────────────────────────────────────────────────────────────────────────────
// OPEN CONVERSATION
// ─────────────────────────────────────────────────────────────────────────────

async function openConversation(id, name, type) {
  activeConvId = id;
  activeConvType = type || 'direct';
  switchTo(VIEW.CHAT, name);
  $msgsContainer.innerHTML = '<div class="chat-loader">Cargando...</div>';

  const msgs = await loadMessages(id);
  $msgsContainer.innerHTML = '';
  msgs.forEach(m => renderMsg(m, false));
  scrollDown();
  setTimeout(() => $chatInput.focus(), 50);
}

function renderMsg(msg, animate = true) {
  const mine = msg.sender_id === currentUser.id;
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let sender = '';
  if (!mine && activeConvType === 'group' && msg.operators) {
    sender = `<div class="msg-sender">${esc(fmtName(msg.operators.display_name || msg.operators.username))}</div>`;
  }

  const div = document.createElement('div');
  div.className = `msg-bubble ${mine ? 'mine' : 'theirs'}`;
  div.innerHTML = `${sender}<div class="msg-content">${esc(msg.content)}</div><div class="msg-time">${time}</div>`;

  if (animate) {
    div.style.opacity = '0';
    div.style.transform = 'translateY(6px)';
  }
  $msgsContainer.appendChild(div);
  if (animate) gsap.to(div, { opacity: 1, y: 0, duration: 0.2 });
  scrollDown();
}

function scrollDown() {
  requestAnimationFrame(() => { $msgsContainer.scrollTop = $msgsContainer.scrollHeight; });
}

// ─────────────────────────────────────────────────────────────────────────────
// SEND MESSAGE
// ─────────────────────────────────────────────────────────────────────────────

async function handleSend(e) {
  e.preventDefault();
  const text = $chatInput.value.trim();
  if (!text || !activeConvId) return;
  $chatInput.value = '';

  renderMsg({ content: text, sender_id: currentUser.id, created_at: new Date().toISOString(), operators: null });

  const res = await sendMessage(activeConvId, text);
  if (!res.ok) console.error('[chat] send failed:', res.error);
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW DIRECT CHAT
// ─────────────────────────────────────────────────────────────────────────────

async function showNewChat() {
  switchTo(VIEW.NEW, 'Nuevo chat');
  $opsContainer.innerHTML = '<div class="chat-loader">Buscando...</div>';

  const ops = await getOperatorsList();
  if (!ops.length) {
    $opsContainer.innerHTML = '<div class="empty-msg">No hay otros operadores.</div>';
    return;
  }

  $opsContainer.innerHTML = ops.map(op => {
    const name = fmtName(op.display_name || op.username);
    return `<div class="op-card" data-id="${op.id}"><div class="op-avatar">${name.charAt(0)}</div><div class="op-name">${esc(name)}</div></div>`;
  }).join('');

  $opsContainer.querySelectorAll('.op-card').forEach(card => {
    card.addEventListener('click', () => startDirect(card.dataset.id));
  });
}

async function startDirect(otherId) {
  // Check existing
  const existing = conversations.find(c =>
    c.type === 'direct' && c.conversation_participants.some(p => p.operator_id === otherId)
  );

  if (existing) {
    const me = existing.conversation_participants.find(p => p.operator_id === currentUser.id);
    if (me?.hidden) await unhideConversation(existing.id);
    openConversation(existing.id, convName(existing), 'direct');
  } else {
    const res = await createConversation('direct', null, [otherId]);
    if (res.ok) {
      // Reload conversations so the new one is in our list
      conversations = await loadConversations();
      const newConv = conversations.find(c => c.id === res.conversation.id);
      openConversation(res.conversation.id, newConv ? convName(newConv) : 'Chat', 'direct');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW GROUP
// ─────────────────────────────────────────────────────────────────────────────

let selectedMembers = [];

async function showGroupForm() {
  switchTo(VIEW.GROUP, 'Nuevo grupo');
  selectedMembers = [];
  $groupNameInput.value = '';
  validateGroupForm();
  $groupOpsContainer.innerHTML = '<div class="chat-loader">Buscando...</div>';

  const ops = await getOperatorsList();
  if (!ops.length) {
    $groupOpsContainer.innerHTML = '<div class="empty-msg">No hay otros operadores.</div>';
    return;
  }

  $groupOpsContainer.innerHTML = ops.map(op => {
    const name = fmtName(op.display_name || op.username);
    return `
      <div class="op-card selectable" data-id="${op.id}">
        <div class="op-avatar">${name.charAt(0)}</div>
        <div class="op-name">${esc(name)}</div>
        <div class="op-check"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg></div>
      </div>`;
  }).join('');

  $groupOpsContainer.querySelectorAll('.op-card.selectable').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      if (selectedMembers.includes(id)) {
        selectedMembers = selectedMembers.filter(m => m !== id);
        card.classList.remove('selected');
      } else {
        selectedMembers.push(id);
        card.classList.add('selected');
      }
      validateGroupForm();
    });
  });
}

function validateGroupForm() {
  const valid = $groupNameInput.value.trim().length > 0 && selectedMembers.length > 0;
  $createGroupBtn.style.opacity = valid ? '1' : '0.5';
  $createGroupBtn.style.pointerEvents = valid ? 'auto' : 'none';
}

async function handleCreateGroup() {
  const name = $groupNameInput.value.trim();
  if (!name || !selectedMembers.length) return;

  $createGroupBtn.textContent = 'Creando...';
  $createGroupBtn.style.pointerEvents = 'none';

  const res = await createConversation('group', name, selectedMembers);

  $createGroupBtn.textContent = 'Crear Grupo';

  if (res.ok) {
    // Reload conversations and open the new group
    conversations = await loadConversations();
    openConversation(res.conversation.id, name, 'group');
  } else {
    console.error('[chat] group creation failed:', res.error);
    $createGroupBtn.style.pointerEvents = 'auto';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REALTIME HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function onRealtimeMessage(msg) {
  // If we're viewing this conversation, append (skip own messages — already optimistic)
  if (activeConvId === msg.conversation_id) {
    if (msg.sender_id !== currentUser.id) {
      renderMsg(msg);
    }
    return;
  }

  // Otherwise show badge notification
  const isMine = conversations.some(c => c.id === msg.conversation_id);
  if (isMine) {
    $badge.classList.remove('hidden');
    if (!isOpen) gsap.fromTo($badge, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
    if (isOpen && currentView === VIEW.LIST) refreshList();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────

function buildHTML() {
  return `
    <div id="chat-widget" class="chat-widget closed">
      <div id="chat-drawer" class="chat-drawer">
        <div class="chat-header">
          <button id="chat-back-btn" class="icon-button hidden" aria-label="Atrás">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h3 id="chat-title" class="chat-title">Mensajes</h3>
          <div class="chat-header-actions">
            <button id="chat-close-btn" class="icon-button" aria-label="Cerrar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
        <div class="chat-body">
          <div id="view-list" class="chat-view active">
            <div id="conversations-container" class="scroll-container"></div>
            <div class="chat-fab-mini-container">
              <button id="new-chat-btn" class="chat-fab-mini" aria-label="Nuevo Chat">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              </button>
            </div>
          </div>
          <div id="view-chat" class="chat-view">
            <div id="messages-container" class="scroll-container messages-area"></div>
            <form id="chat-input-form" class="chat-input-area">
              <input type="text" id="chat-input" placeholder="Escribe un mensaje..." autocomplete="off" />
              <button type="submit" class="send-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              </button>
            </form>
          </div>
          <div id="view-new" class="chat-view">
            <div class="new-chat-header" style="display:flex; justify-content:space-between; align-items:center;">
              <p>Selecciona un operador:</p>
              <button id="create-group-nav-btn" class="text-button" style="font-size:12px; color:#4facfe;">Crear Grupo</button>
            </div>
            <div id="operators-container" class="scroll-container"></div>
          </div>
          <div id="view-new-group" class="chat-view">
            <div class="new-chat-header"><p>Nuevo grupo</p></div>
            <div style="padding: 16px 16px 0;">
              <input type="text" id="new-group-name" class="chat-group-input" placeholder="Nombre del grupo..." autocomplete="off" />
            </div>
            <div class="new-chat-header" style="padding-top: 8px;"><p>Miembros:</p></div>
            <div id="group-operators-container" class="scroll-container" style="flex:1;"></div>
            <div style="padding: 16px; text-align: center;">
              <button id="create-group-btn" class="primary-button" style="width:100%; padding: 10px; opacity:0.5; pointer-events:none;">Crear Grupo</button>
            </div>
          </div>
        </div>
      </div>
      <button id="chat-main-fab" class="chat-fab" aria-label="Abrir Chat">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
        <span id="chat-badge" class="chat-badge hidden"></span>
      </button>
    </div>`;
}
