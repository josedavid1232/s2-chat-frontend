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
            // Si el mensaje recibido es una actualización/edición de uno existente
            const existsIndex = prevMessages.findIndex(m => m.id && m.id === receivedMessage.id);
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

  // Guardar edición de mensaje
  const saveEditedMessage = (msgId) => {
    if (!editingText.trim()) return;

    if (stompClientRef.current && stompClientRef.current.connected) {
      const editPayload = {
        id: msgId,
        sender: username,
        content: editingText.trim(),
        edited: true,
        type: 'EDIT'
      };

      stompClientRef.current.publish({
        destination: '/app/chat.editMessage',
        body: JSON.stringify(editPayload),
      });

      // Actualización local defensiva mientras llega la retransmisión
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editingText.trim(), edited: true } : m));
      setEditingMessageId(null);
      setEditingText('');
    }
  };

  return (
    <div className="chat-container" style={{ padding: '20px', maxWidth: '650px', margin: '20px auto', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
        <h2>Chat Global</h2>
        
        <div style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', background: '#161b22', padding: '6px 12px', borderRadius: '20px', border: '1px solid #30363d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ height: '10px', width: '10px', backgroundColor: '#238636', borderRadius: '50%', display: 'inline-block' }}></span>
            <span style={{ color: '#3fb950', fontWeight: 'bold' }}>
              {userCount} {userCount === 1 ? 'conectado' : 'conectados'}
            </span>
          </div>
          <span style={{ color: '#8b949e', borderLeft: '1px solid #30363d', paddingLeft: '10px' }}>
            🧹 El chat se reinicia cada 30 minutos
          </span>
        </div>
      </div>
      
      <div style={{ marginBottom: '15px', background: '#161b22', padding: '12px', borderRadius: '6px', border: '1px solid #30363d' }}>
        {!isEditingUsername ? (
          <div>
            <span>Tu apodo actual: <strong style={{ color: getUserColor(username) }}>{username}</strong></span>
            <button 
              onClick={() => { setTempUsername(username); setIsEditingUsername(true); }} 
              style={{ marginLeft: '10px', padding: '4px 10px', cursor: 'pointer', background: '#238636', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Cambiar
            </button>
          </div>
        ) : (
          <form onSubmit={handleUsernameSubmit}>
            <input
              type="text"
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              placeholder="Nuevo apodo..."
              style={{ padding: '6px', marginRight: '5px', background: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '4px' }}
            />
            <button type="submit" style={{ padding: '6px 12px', cursor: 'pointer', background: '#238636', color: 'white', border: 'none', borderRadius: '4px' }}>Guardar</button>
            <button 
              type="button" 
              onClick={() => setIsEditingUsername(false)}
              style={{ marginLeft: '5px', padding: '6px 12px', cursor: 'pointer', background: '#da3633', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Cancelar
            </button>
          </form>
        )}
      </div>

      {/* Caja de mensajes */}
      <div className="chat-box" style={{ height: '380px', border: '1px solid #30363d', overflowY: 'scroll', padding: '12px', background: '#010409', marginBottom: '10px', display: 'flex', flexDirection: 'column', justifyContent: isLoading ? 'center' : 'flex-start', alignItems: isLoading ? 'center' : 'stretch' }}>
        {isLoading ? (
          <div style={{ color: '#8b949e', textAlign: 'center' }}>
            <p>⏳ Conectando con el servidor (despertando Render)...</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ color: '#8b949e', textAlign: 'center', marginTop: '140px' }}>
            No hay mensajes aún. ¡Sé el primero en escribir!
          </div>
        ) : (
          messages.slice(-50).map((msg, index) => {
            const isMyMessage = msg.sender === username;
            const isEditingThis = editingMessageId === (msg.id || index);

            return (
              <div key={msg.id || index} style={{ marginBottom: '10px', wordBreak: 'break-word', background: '#0d1117', padding: '8px 10px', borderRadius: '6px', border: '1px solid #21262d' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ color: getUserColor(msg.sender), fontWeight: 'bold', fontSize: '14px' }}>
                    {msg.sender}
                  </span>
                  
                  {isMyMessage && !isEditingThis && (
                    <button 
                      onClick={() => { setEditingMessageId(msg.id || index); setEditingText(msg.content); }}
                      style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
                    >
                      Editar
                    </button>
                  )}
                </div>

                {isEditingThis ? (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      style={{ flex: 1, padding: '4px 8px', background: '#161b22', color: 'white', border: '1px solid #30363d', borderRadius: '4px' }}
                    />
                    <button 
                      onClick={() => saveEditedMessage(msg.id || index)}
                      style={{ padding: '4px 10px', background: '#238636', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Guardar
                    </button>
                    <button 
                      onClick={() => setEditingMessageId(null)}
                      style={{ padding: '4px 10px', background: '#30363d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div style={{ color: '#c9d1d9', fontSize: '14px' }}>
                    {renderMessageContent(msg.content)}
                    {msg.edited && <span style={{ color: '#8b949e', fontSize: '11px', marginLeft: '6px' }}>(editado)</span>}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Escribe un mensaje o pega una URL..."
          style={{ flex: 1, padding: '10px', background: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '4px' }}
        />
        <button type="submit" style={{ padding: '10px 20px', background: '#1f6feb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Enviar
        </button>
      </form>
    </div>
  );
}

export default App;
