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
    // Obtiene la URL del backend desde las variables de entorno de Vercel o usa localhost para pruebas
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
    if (!messageInput.trim()) return; // Validación de campos vacíos (HU-C06)

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
    <div className="chat-container" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', color: 'white' }}>
      <h2>RuneScape Classic Chat - Canal Principal</h2>
      
      {/* Sección para cambiar el apodo (HU-C04) */}
      <div style={{ marginBottom: '15px', background: '#222', padding: '10px', borderRadius: '5px' }}>
        {!isEditingUsername ? (
          <div>
            <span>Tu apodo actual: <strong>{username}</strong></span>
            <button 
              onClick={() => setIsEditingUsername(true)} 
              style={{ marginLeft: '10px', padding: '4px 8px', cursor: 'pointer' }}
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
              style={{ padding: '5px', marginRight: '5px' }}
            />
            <button type="submit" style={{ padding: '5px 10px', cursor: 'pointer' }}>Guardar</button>
            <button 
              type="button" 
              onClick={() => { setTempUsername(username); setIsEditingUsername(false); }}
              style={{ marginLeft: '5px', padding: '5px 10px', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </form>
        )}
      </div>

      {/* Ventana de mensajes */}
      <div className="chat-box" style={{ height: '350px', border: '1px solid #444', overflowY: 'scroll', padding: '10px', background: '#111', marginBottom: '10px' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '8px' }}>
            <strong>{msg.sender}:</strong> {msg.content}
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
          style={{ flex: 1, padding: '8px' }}
        />
        <button type="submit" style={{ padding: '8px 15px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
          Enviar
        </button>
      </form>
    </div>
  );
}

export default App;
