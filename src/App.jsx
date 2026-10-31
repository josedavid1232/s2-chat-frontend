import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(false); // 👈 Estado clave para saber si está conectado
  const stompClientRef = useRef(null);

  useEffect(() => {
    // Conexión a tu backend (apunta a tu URL de Render o localhost según corresponda)
    const socket = new SockJS('https://s2-chat-backend.onrender.com/ws'); // Cambia por tu endpoint si es distinto
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000, // Reconecta automáticamente si se cae la red con Render
      onConnect: () => {
        console.log('Conectado al WebSocket!');
        setIsConnected(true); // 👈 Activamos el estado de conexión

        // Suscripción al canal público del chat
        stompClient.subscribe('/topic/public', (message) => {
          const newMessage = JSON.parse(message.body);
          setMessages((prev) => [...prev, newMessage]);
        });
      },
      onDisconnect: () => {
        console.log('Desconectado del WebSocket');
        setIsConnected(false); // 👈 Desactivamos si se pierde la conexión
      },
    });

    stompClient.activate();
    stompClientRef.current = stompClient;

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    
    // 🛡️ PROTECCIÓN CRÍTICA: Si no está conectado, evitamos que intente enviar y bloqueamos el error
    if (!isConnected || !stompClientRef.current) {
      alert("El WebSocket no está conectado aún. Espera un momento o recarga si persiste.");
      return;
    }

    if (messageInput.trim() === '') return;

    const chatMessage = {
      sender: 'Heroe_4', // O tu estado de usuario actual
      content: messageInput,
      type: 'CHAT'
    };

    stompClientRef.current.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify(chatMessage),
    });

    setMessageInput('');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>RuneScape Classic Chat - Canal Principal</h2>
      
      {/* 🟢 Indicador visual de estado para que sepas si está listo para enviar */}
      <div style={{ marginBottom: '10px', fontSize: '14px' }}>
        Estado: {isConnected ? <span style={{ color: 'green' }}>● Conectado</span> : <span style={{ color: 'red' }}>● Conectando...</span>}
      </div>

      <div style={{ background: '#111', color: '#fff', height: '300px', overflowY: 'scroll', padding: '10px', marginBottom: '10px' }}>
        {messages.map((msg, index) => (
          <div key={index}><b>{msg.sender}:</b> {msg.content}</div>
        ))}
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          style={{ flex: 1, padding: '8px' }}
        />
        {/* 🚫 El botón se desgrana/deshabilita automáticamente si no hay conexión, evitando el error */}
        <button 
          type="submit" 
          disabled={!isConnected}
          style={{ padding: '8px 16px', opacity: isConnected ? 1 : 0.5, cursor: isConnected ? 'pointer' : 'not-allowed' }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

export default Chat;
