import gsap from 'gsap';
import { getCurrentUser } from '../database/auth.js';
import { 
  loadConversations, 
  loadMessages, 
  sendMessage, 
  createConversation, 
  getOperatorsList,
  subscribeToMessages 
} from '../database/chat.js';

let currentUser = null;
let currentConversations = [];
let activeConversationId = null;
let realtimeChannel = null;

// Enums for views
const VIEW_LIST = 'LIST';
const VIEW_CHAT = 'CHAT';
const VIEW_NEW = 'NEW';
let currentView = VIEW_LIST;

export async function initChatWidget(container) {
  currentUser = await getCurrentUser();
  if (!currentUser) return;

  // 1. Inject HTML
  const widgetHtml = `
    <div id="chat-widget" class="chat-widget closed">
      <div id="chat-drawer" class="chat-drawer">
        <!-- Header -->
        <div class="chat-header">
          <button id="chat-back-btn" class="icon-button hidden" aria-label="Atrás">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h3 id="chat-title" class="chat-title">Mensajes</h3>
          <button id="chat-close-btn" class="icon-button" aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <!-- Body -->
        <div class="chat-body">
          <!-- View: List -->
          <div id="view-list" class="chat-view active">
            <div id="conversations-container" class="scroll-container">
              <div class="chat-loader">Cargando...</div>
            </div>
            <div class="chat-fab-mini-container">
              <button id="new-chat-btn" class="chat-fab-mini" aria-label="Nuevo Chat">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              </button>
            </div>
          </div>

          <!-- View: Chat -->
          <div id="view-chat" class="chat-view">
            <div id="messages-container" class="scroll-container messages-area">
              <!-- Messages go here -->
            </div>
            <form id="chat-input-form" class="chat-input-area">
              <input type="text" id="chat-input" placeholder="Escribe un mensaje..." autocomplete="off" />
              <button type="submit" class="send-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              </button>
            </form>
          </div>

          <!-- View: New -->
          <div id="view-new" class="chat-view">
            <div class="new-chat-header">
              <p>Selecciona un operador:</p>
            </div>
            <div id="operators-container" class="scroll-container">
              <!-- Operators go here -->
            </div>
          </div>
        </div>
      </div>

      <!-- Main FAB -->
      <button id="chat-main-fab" class="chat-fab" aria-label="Abrir Chat">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
        <span id="chat-badge" class="chat-badge hidden"></span>
      </button>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', widgetHtml);

  // 2. Cache DOM elements
  const widget = document.getElementById('chat-widget');
  const fab = document.getElementById('chat-main-fab');
  const drawer = document.getElementById('chat-drawer');
  const closeBtn = document.getElementById('chat-close-btn');
  const backBtn = document.getElementById('chat-back-btn');
  const title = document.getElementById('chat-title');
  const viewList = document.getElementById('view-list');
  const viewChat = document.getElementById('view-chat');
  const viewNew = document.getElementById('view-new');
  const convContainer = document.getElementById('conversations-container');
  const msgsContainer = document.getElementById('messages-container');
  const opsContainer = document.getElementById('operators-container');
  const newChatBtn = document.getElementById('new-chat-btn');
  const chatForm = document.getElementById('chat-input-form');
  const chatInput = document.getElementById('chat-input');

  let isOpen = false;

  // 3. Setup Events
  fab.addEventListener('click', () => toggleDrawer(true));
  closeBtn.addEventListener('click', () => toggleDrawer(false));
  
  backBtn.addEventListener('click', () => {
    if (currentView === VIEW_CHAT) {
      activeConversationId = null;
      switchView(VIEW_LIST);
      refreshConversations();
    } else if (currentView === VIEW_NEW) {
      switchView(VIEW_LIST);
    }
  });

  newChatBtn.addEventListener('click', async () => {
    switchView(VIEW_NEW);
    opsContainer.innerHTML = '<div class="chat-loader">Buscando compañeros...</div>';
    const ops = await getOperatorsList();
    
    if (ops.length === 0) {
      opsContainer.innerHTML = '<div class="empty-msg">No hay otros operadores registrados.</div>';
      return;
    }

    opsContainer.innerHTML = ops.map(op => `
      <div class="op-card" data-id="${op.id}" data-name="${op.display_name || op.username}">
        <div class="op-avatar">${(op.display_name || op.username).charAt(0).toUpperCase()}</div>
        <div class="op-name">Dr/a. ${op.display_name || op.username}</div>
      </div>
    `).join('');

    opsContainer.querySelectorAll('.op-card').forEach(card => {
      card.addEventListener('click', () => startDirectChat(card.dataset.id, card.dataset.name));
    });
  });

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text || !activeConversationId) return;

    chatInput.value = '';
    // Optimistic UI
    appendMessage({
      content: text,
      sender_id: currentUser.id,
      created_at: new Date().toISOString()
    });
    
    await sendMessage(activeConversationId, text);
  });

  // 4. Core Logic Functions
  function toggleDrawer(open) {
    isOpen = open;
    if (open) {
      widget.classList.remove('closed');
      gsap.fromTo(drawer, { y: 20, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out' });
      gsap.to(fab, { scale: 0, duration: 0.2 });
      if (currentView === VIEW_LIST) refreshConversations();
    } else {
      gsap.to(drawer, { y: 20, opacity: 0, scale: 0.95, duration: 0.3, onComplete: () => {
        widget.classList.add('closed');
        gsap.to(fab, { scale: 1, duration: 0.3, ease: 'back.out(1.5)' });
      }});
    }
  }

  function switchView(view, customTitle = 'Mensajes') {
    currentView = view;
    title.textContent = customTitle;
    
    [viewList, viewChat, viewNew].forEach(v => v.classList.remove('active'));
    
    if (view === VIEW_LIST) {
      viewList.classList.add('active');
      backBtn.classList.add('hidden');
    } else if (view === VIEW_CHAT) {
      viewChat.classList.add('active');
      backBtn.classList.remove('hidden');
      setTimeout(() => chatInput.focus(), 100);
    } else if (view === VIEW_NEW) {
      viewNew.classList.add('active');
      backBtn.classList.remove('hidden');
    }
  }

  async function refreshConversations() {
    convContainer.innerHTML = '<div class="chat-loader">Cargando...</div>';
    currentConversations = await loadConversations();
    
    if (currentConversations.length === 0) {
      convContainer.innerHTML = '<div class="empty-msg">No tienes conversaciones aún.</div>';
      return;
    }

    convContainer.innerHTML = currentConversations.map(conv => {
      // Find the "other" participant's name for direct chats
      let chatName = conv.name;
      if (conv.type === 'direct') {
        const other = conv.conversation_participants.find(p => p.operator_id !== currentUser.id);
        chatName = other ? (other.operators.display_name || other.operators.username) : 'Chat';
      }
      return `
        <div class="conv-item" data-id="${conv.id}" data-name="${chatName}">
          <div class="conv-avatar">${chatName.charAt(0).toUpperCase()}</div>
          <div class="conv-details">
            <div class="conv-name">${chatName}</div>
          </div>
        </div>
      `;
    }).join('');

    convContainer.querySelectorAll('.conv-item').forEach(item => {
      item.addEventListener('click', () => openChat(item.dataset.id, item.dataset.name));
    });
  }

  async function startDirectChat(otherOpId, otherOpName) {
    // Check if direct chat already exists
    const existing = currentConversations.find(c => 
      c.type === 'direct' && 
      c.conversation_participants.some(p => p.operator_id === otherOpId)
    );

    if (existing) {
      openChat(existing.id, otherOpName);
    } else {
      // Create new
      const res = await createConversation('direct', null, [otherOpId]);
      if (res.ok) {
        openChat(res.conversation.id, otherOpName);
      } else {
        console.error('Error creating chat:', res.error);
        alert('No se pudo crear el chat: ' + res.error);
      }
    }
  }

  async function openChat(convId, convName) {
    activeConversationId = convId;
    switchView(VIEW_CHAT, convName);
    msgsContainer.innerHTML = '<div class="chat-loader">Cargando mensajes...</div>';
    
    const msgs = await loadMessages(convId);
    msgsContainer.innerHTML = '';
    msgs.forEach(appendMessage);
    scrollToBottom();
  }

  function appendMessage(msg) {
    const isMine = msg.sender_id === currentUser.id;
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const div = document.createElement('div');
    div.className = `msg-bubble ${isMine ? 'mine' : 'theirs'}`;
    div.innerHTML = `
      <div class="msg-content">${msg.content}</div>
      <div class="msg-time">${time}</div>
    `;
    msgsContainer.appendChild(div);
    scrollToBottom();
  }

  function scrollToBottom() {
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
  }

  // 5. Setup Realtime Subscription
  realtimeChannel = subscribeToMessages((newMsg) => {
    if (activeConversationId === newMsg.conversation_id) {
      // Only append if it's not mine (mine is optimistically added)
      if (newMsg.sender_id !== currentUser.id) {
        appendMessage(newMsg);
      }
    } else {
      // Notify on FAB if closed or in another view
      if (!isOpen || currentView !== VIEW_CHAT) {
        const badge = document.getElementById('chat-badge');
        badge.classList.remove('hidden');
        gsap.fromTo(badge, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
      }
    }
  });

  // Clear badge when opening drawer
  fab.addEventListener('click', () => document.getElementById('chat-badge').classList.add('hidden'));
}
