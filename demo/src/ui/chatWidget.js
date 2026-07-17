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
  unhideConversation
} from '../database/chat.js';

let currentUser = null;
let currentConversations = [];
let activeConversationId = null;
let realtimeChannel = null;

// Enums for views
const VIEW_LIST = 'LIST';
const VIEW_CHAT = 'CHAT';
const VIEW_NEW = 'NEW';
const VIEW_NEW_GROUP = 'NEW_GROUP';
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
          <div class="chat-header-actions">
            <button id="chat-close-btn" class="icon-button" aria-label="Cerrar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
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
            <div class="new-chat-header" style="display:flex; justify-content:space-between; align-items:center;">
              <p>Selecciona un operador:</p>
              <button id="create-group-nav-btn" class="text-button" style="font-size:12px; color:#4facfe;">Crear Grupo</button>
            </div>
            <div id="operators-container" class="scroll-container">
              <!-- Operators go here -->
            </div>
          </div>

          <!-- View: New Group -->
          <div id="view-new-group" class="chat-view">
            <div class="new-chat-header">
              <p>Crear Nuevo Grupo</p>
            </div>
            <div style="padding: 16px; padding-bottom: 0;">
              <input type="text" id="new-group-name" class="chat-group-input" placeholder="Nombre del grupo..." autocomplete="off" />
            </div>
            <div class="new-chat-header" style="padding-top: 8px;">
              <p>Selecciona los miembros:</p>
            </div>
            <div id="group-operators-container" class="scroll-container" style="flex:1;">
              <!-- Operators for group selection -->
            </div>
            <div style="padding: 16px; text-align: center;">
              <button id="create-group-btn" class="primary-button" style="width:100%; padding: 10px; opacity:0.5; pointer-events:none;">Crear Grupo</button>
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
  const viewNewGroup = document.getElementById('view-new-group');
  const convContainer = document.getElementById('conversations-container');
  const msgsContainer = document.getElementById('messages-container');
  const opsContainer = document.getElementById('operators-container');
  const groupOpsContainer = document.getElementById('group-operators-container');
  const newChatBtn = document.getElementById('new-chat-btn');
  const createGroupNavBtn = document.getElementById('create-group-nav-btn');
  const createGroupBtn = document.getElementById('create-group-btn');
  const groupNameInput = document.getElementById('new-group-name');
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
    } else if (currentView === VIEW_NEW_GROUP) {
      switchView(VIEW_NEW);
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

    opsContainer.innerHTML = ops.map(op => {
      const rawName = op.display_name || op.username;
      const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
      return `
        <div class="op-card" data-id="${op.id}" data-name="${formattedName}">
          <div class="op-avatar">${formattedName.charAt(0)}</div>
          <div class="op-name">${formattedName}</div>
        </div>
      `;
    }).join('');

    opsContainer.querySelectorAll('.op-card').forEach(card => {
      card.addEventListener('click', () => startDirectChat(card.dataset.id, card.dataset.name));
    });
  });

  // Group creation logic
  let selectedGroupMembers = [];

  function updateCreateGroupBtn() {
    const name = groupNameInput.value.trim();
    if (name.length > 0 && selectedGroupMembers.length > 0) {
      createGroupBtn.style.opacity = '1';
      createGroupBtn.style.pointerEvents = 'auto';
    } else {
      createGroupBtn.style.opacity = '0.5';
      createGroupBtn.style.pointerEvents = 'none';
    }
  }

  groupNameInput.addEventListener('input', updateCreateGroupBtn);

  createGroupNavBtn.addEventListener('click', async () => {
    switchView(VIEW_NEW_GROUP);
    groupNameInput.value = '';
    selectedGroupMembers = [];
    updateCreateGroupBtn();
    groupOpsContainer.innerHTML = '<div class="chat-loader">Buscando compañeros...</div>';
    
    const ops = await getOperatorsList();
    if (ops.length === 0) {
      groupOpsContainer.innerHTML = '<div class="empty-msg">No hay otros operadores registrados.</div>';
      return;
    }

    groupOpsContainer.innerHTML = ops.map(op => {
      const rawName = op.display_name || op.username;
      const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
      return `
        <div class="op-card selectable" data-id="${op.id}">
          <div class="op-avatar">${formattedName.charAt(0)}</div>
          <div class="op-name">${formattedName}</div>
          <div class="op-check">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
        </div>
      `;
    }).join('');

    groupOpsContainer.querySelectorAll('.op-card.selectable').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        if (selectedGroupMembers.includes(id)) {
          selectedGroupMembers = selectedGroupMembers.filter(m => m !== id);
          card.classList.remove('selected');
        } else {
          selectedGroupMembers.push(id);
          card.classList.add('selected');
        }
        updateCreateGroupBtn();
      });
    });
  });

  createGroupBtn.addEventListener('click', async () => {
    if (createGroupBtn.disabled) return;
    const name = groupNameInput.value.trim();
    if (!name || selectedGroupMembers.length === 0) return;
    
    createGroupBtn.disabled = true;
    createGroupBtn.style.pointerEvents = 'none';
    createGroupBtn.innerHTML = 'Creando...';
    
    const res = await createConversation('group', name, selectedGroupMembers);
    
    createGroupBtn.innerHTML = 'Crear Grupo';
    createGroupBtn.disabled = false;
    createGroupBtn.style.pointerEvents = 'auto';
    
    if (res.ok) {
      openChat(res.conversation.id, name);
    } else {
      console.error('Error creating group:', res.error);
      alert('No se pudo crear el grupo: ' + res.error);
    }
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
    
    [viewList, viewChat, viewNew, viewNewGroup].forEach(v => v.classList.remove('active'));
    
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
    } else if (view === VIEW_NEW_GROUP) {
      viewNewGroup.classList.add('active');
      backBtn.classList.remove('hidden');
    }
  }

  async function refreshConversations() {
    convContainer.innerHTML = '<div class="chat-loader">Cargando...</div>';
    currentConversations = await loadConversations();
    
    // Filter out hidden conversations
    const visibleConversations = currentConversations.filter(conv => {
      const me = conv.conversation_participants.find(p => p.operator_id === currentUser.id);
      return me && !me.hidden;
    });

    if (visibleConversations.length === 0) {
      convContainer.innerHTML = '<div class="empty-msg">No tienes conversaciones aún.</div>';
      return;
    }

    convContainer.innerHTML = visibleConversations.map(conv => {
      let chatName = conv.name || 'Chat';
      if (conv.type === 'direct') {
        const other = conv.conversation_participants.find(p => p.operator_id !== currentUser.id);
        if (other) {
           chatName = other.operators.display_name || other.operators.username;
        }
      }
      chatName = chatName.charAt(0).toUpperCase() + chatName.slice(1).toLowerCase();
      return `
        <div class="conv-item" data-id="${conv.id}" data-name="${chatName}">
          <div class="conv-avatar">${chatName.charAt(0).toUpperCase()}</div>
          <div class="conv-details" style="flex: 1;">
            <div class="conv-name">${chatName}</div>
          </div>
          <button class="icon-button conv-hide-btn" aria-label="Ocultar chat" style="opacity: 0.7; z-index: 10;">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff4757" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      `;
    }).join('');

    convContainer.querySelectorAll('.conv-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Prevent opening if the delete button was clicked
        if (e.target.closest('.conv-hide-btn')) return;
        openChat(item.dataset.id, item.dataset.name);
      });
      
      const hideBtn = item.querySelector('.conv-hide-btn');
      if (hideBtn) {
        hideBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm('¿Seguro que quieres ocultar este chat de tu bandeja?')) {
            await hideConversation(item.dataset.id);
            refreshConversations();
          }
        });
      }
    });
  }

  async function startDirectChat(otherOpId, otherOpName) {
    // Check if direct chat already exists
    const existing = currentConversations.find(c => 
      c.type === 'direct' && 
      c.conversation_participants.some(p => p.operator_id === otherOpId)
    );

    if (existing) {
      // If it was hidden, unhide it first
      const me = existing.conversation_participants.find(p => p.operator_id === currentUser.id);
      if (me && me.hidden) {
        await unhideConversation(existing.id);
      }
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
