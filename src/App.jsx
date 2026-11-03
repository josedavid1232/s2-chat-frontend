import React, { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [username, setUsername] = useState('Heroe_' + Math.floor(Math.random() * 1000));
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);
  
  const stompClientRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_API_URL || 'https://s2-chat-backend.onrender.com';
    const socketFactory = () => new SockJS(`${backendUrl}/ws`);
    
    const client = new Client({
      webSocketFactory: socketFactory,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('Conectado al WebSocket');
        client.subscribe('/topic/public', (message) => {
          const receivedMessage = JSON.parse(message.body);
          setMessages((prevMessages) => [...prevMessages, receivedMessage]);
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
      setUsername(tempUsername.trim());
      setIsEditingUsername(false);
    }
  };

  return (
    <div className="chat-container" style={{ padding: '20px', maxWidth: '600px', margin: '20px auto', color: 'white' }}>
      {/* Título limpio como Chat Global */}
      <h2>Chat Global</h2>
      
      {/* Sección para cambiar el apodo */}
      <div style={{ marginBottom: '15px', background: '#161b22', padding: '12px', borderRadius: '6px', border: '1px solid #30363d' }}>
        {!isEditingUsername ? (
          <div>
            <span>Tu apodo actual: <strong style={{ color: '#ff5555' }}>{username}</strong></span>
            <button 
              onClick={() => setIsEditingUsername(true)} 
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
              onClick={() => { setTempUsername(username); setIsEditingUsername(false); }}
              style={{ marginLeft: '5px', padding: '6px 12px', cursor: 'pointer', background: '#da3633', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Cancelar
            </button>
          </form>
        )}
      </div>

      {/* Ventana de mensajes */}
      <div className="chat-box" style={{ height: '350px', border: '1px solid #30363d', overflowY: 'scroll', padding: '12px', background: '#010409', marginBottom: '10px' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '8px', wordBreak: 'break-word' }}>
            {/* Nombres en rojo */}
            <span style={{ color: '#ff5555', fontWeight: 'bold' }}>
              {msg.sender}:
            </span>{' '}
            <span style={{ color: '#c9d1d9' }}>{msg.content}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulario de envío */}
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Escribe un mensaje y presiona Enviar..."
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
