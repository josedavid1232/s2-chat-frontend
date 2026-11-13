import React, { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import './App.css';

// Función para generar un color consistente basado en el apodo
const getUserColor = (name) => {
  if (!name) return '#ff5555';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#ff5555', '#58a6ff', '#3fb950', '#d29922', 
    '#bc8cff', '#f778ba', '#79c0ff', '#56d364', '#e3b341'
  ];
  return colors[Math.abs(hash) % colors.length];
};

// Función helper para transformar texto con URLs en componentes con <a> clickeables
const renderMessageContent = (content) => {
  if (!content) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ color: '#58a6ff', textDecoration: 'underline', wordBreak: 'break-all' }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

function App() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
   
  // Usuario guardado en localStorage o generado
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('chat_username') || ('Heroe_' + Math.floor(Math.random() * 1000));
  });

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);
  const [userCount, setUserCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
   
  // Estado para la edición de mensajes
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const stompClientRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_API_URL || 'https://s2-chat-backend.onrender.com';
     
    // 1. Cargar historial
    fetch(`${backendUrl}/messages`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error cargando el historial:", err);
        setIsLoading(false);
      });

    // 2. Configurar WebSocket
    const socketFactory = () => new SockJS(`${backendUrl}/ws`);
     
    const client = new Client({
      webSocketFactory: socketFactory,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('Conectado al WebSocket');
         
        client.subscribe('/topic/public', (message) => {
          const receivedMessage = JSON.parse(message.body);
          setMessages((prevMessages) => {
            const existsIndex = prevMessages.findIndex(m => m.id !== undefined && m.id === receivedMessage.id);
            if (existsIndex !== -1) {
              const updated = [...prevMessages];
              updated[existsIndex] = receivedMessage;
              return updated;
            }
            return [...prevMessages, receivedMessage];
          });
        });

        client.subscribe('/topic/users', (message) => {
          const count = JSON.parse(message.body);
          setUserCount(count);
        });
      },
      onStompError: (frame) => {
        console.error('Error en STOMP: ' + frame.headers['message']);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    if (stompClientRef.current && stompClientRef.current.connected) {
      const chatMessage = {
        sender: username,
        content: messageInput,
        type: 'CHAT'
      };

      stompClientRef.current.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(chatMessage),
      });

      setMessageInput('');
    }
  };

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (tempUsername.trim()) {
      const newName = tempUsername.trim();
      setUsername(newName);
      localStorage.setItem('chat_username', newName);
      setIsEditingUsername(false);
    }
  };

  // Guardar edición de mensaje de forma robusta
  const saveEditedMessage = (msgId, index) => {
    if (!editingText.trim()) return;

    const targetMessage = messages.find(m => m.id === msgId || messages.indexOf(m) === index);
    const identifier = targetMessage ? (targetMessage.id !== undefined ? targetMessage.id : index) : msgId;

    if (stompClientRef.current && stompClientRef.current.connected) {
      const editPayload = {
        id: identifier,
        sender: username,
        content: editingText.trim(),
        edited: true,
        type: 'EDIT'
      };

      stompClientRef.current.publish({
        destination: '/app/chat.editMessage',
        body: JSON.stringify(editPayload),
      });

      setMessages(prev => prev.map((m, idx) => 
        (m.id === identifier || idx === index) ? { ...m, content: editingText.trim(), edited: true } : m
      ));
       
      setEditingMessageId(null);
      setEditingText('');
    }
  };

  return (
    <div className="chat-container">
      {/* Cabecera unificada y moderna */}
      <div className="chat-header-bar">
        <h2>Chat Global</h2>
         
        <div className="status-pill">
          <span style={{ height: '8px', width: '8px', backgroundColor: '#238636', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #238636' }}></span>
          <span style={{ color: '#3fb950', fontWeight: 'bold' }}>
            {userCount} {userCount === 1 ? 'conectado' : 'conectados'}
          </span>
          <span style={{ color: '#8b949e', borderLeft: '1px solid #30363d', paddingLeft: '8px', fontSize: '11px' }}>
            🧹 30 min
          </span>
        </div>
      </div>
       
      {/* Barra de perfil / Apodo rediseñada */}
      <div className="user-profile-bar">
        {!isEditingUsername ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', fontSize: '13px' }}>
            <span>Tu apodo activo: <strong style={{ color: getUserColor(username) }}>{username}</strong></span>
            <button 
              onClick={() => { setTempUsername(username); setIsEditingUsername(true); }} 
              style={{ padding: '4px 10px', cursor: 'pointer', background: '#238636', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px' }}
            >
              Cambiar apodo
            </button>
          </div>
        ) : (
          <form onSubmit={handleUsernameSubmit} style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <input
              type="text"
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              placeholder="Escribe tu nuevo apodo..."
              style={{ flex: 1, padding: '6px 10px', background: '#060911', color: 'white', border: '1px solid #30363d', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
            <button type="submit" style={{ padding: '6px 12px', cursor: 'pointer', background: '#238636', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px' }}>Guardar</button>
            <button 
              type="button" 
              onClick={() => setIsEditingUsername(false)}
              style={{ padding: '6px 12px', cursor: 'pointer', background: '#da3633', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px' }}
            >
              Cancelar
            </button>
          </form>
        )}
      </div>

      {/* Caja de mensajes */}
      <div className="chat-box">
        {isLoading ? (
          <div style={{ color: '#8b949e', textAlign: 'center', margin: 'auto' }}>
            <p>⏳ Conectando al servidor...</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ color: '#8b949e', textAlign: 'center', margin: 'auto', fontSize: '13px' }}>
            No hay mensajes aún. ¡Sé el primero en escribir!
          </div>
        ) : (
          messages.slice(-50).map((msg, index) => {
            const isMyMessage = msg.sender === username;
            const messageKey = msg.id !== undefined ? msg.id : index;
            const isEditingThis = editingMessageId === messageKey;

            return (
              <div 
                key={messageKey} 
                className={`chat-message ${isMyMessage ? 'mine' : ''}`}
              >
                {/* Avatar circular con la inicial */}
                <div className="user-avatar" style={{ backgroundColor: getUserColor(msg.sender) }}>
                  {msg.sender ? msg.sender.charAt(0).toUpperCase() : '?'}
                </div>

                {/* Burbuja de mensaje adaptada al texto */}
                <div className="message-bubble">
                  <div style={{ wordBreak: 'break-word' }}>
                    <span style={{ color: getUserColor(msg.sender), fontWeight: 'bold', marginRight: '6px', fontSize: '13px' }}>
                      {msg.sender}:
                    </span>

                    {isEditingThis ? (
                      <div style={{ display: 'inline-flex', gap: '6px', marginTop: '4px' }}>
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          style={{ padding: '4px 8px', background: '#161b22', color: 'white', border: '1px solid #30363d', borderRadius: '4px', fontSize: '13px' }}
                        />
                        <button 
                          onClick={() => saveEditedMessage(msg.id, index)}
                          style={{ padding: '4px 8px', background: '#238636', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          OK
                        </button>
                        <button 
                          onClick={() => setEditingMessageId(null)}
                          style={{ padding: '4px 8px', background: '#30363d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#c9d1d9', fontSize: '13px' }}>
                        {renderMessageContent(msg.content)}
                        {msg.edited && <span style={{ color: '#8b949e', fontSize: '10px', marginLeft: '6px' }}>(editado)</span>}
                      </span>
                    )}
                  </div>

                  {isMyMessage && !isEditingThis && (
                    <div style={{ textAlign: 'right', marginTop: '4px' }}>
                      <button 
                        onClick={() => { setEditingMessageId(messageKey); setEditingText(msg.content); }}
                        style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulario de envío rediseñado */}
      <form onSubmit={sendMessage} className="chat-input-form">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Escribe un mensaje o comparte una URL..."
        />
        <button type="submit" className="chat-send-btn">
          Enviar 🚀
        </button>
      </form>
    </div>
  );
}

export default App;
