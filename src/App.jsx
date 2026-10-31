import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const stompClientRef = useRef(null);

  useEffect(() => {
    const socket = new SockJS('https://s2-chat-backend.onrender.com/ws');
    
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 3000,
      onConnect: () => {
        console.log('¡Conectado al WebSocket con SockJS!');
        setIsConnected(true);

        stompClient.subscribe('/topic/public', (message) => {
          const newMessage = JSON.parse(message.body);
          setMessages((prev) => [...prev, newMessage]);
        });
      },
      onDisconnect: () => {
        console.log('Desconectado del WebSocket');
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.error('Error en STOMP: ' + frame.headers['message']);
        setIsConnected(false);
      }
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
    
    if (!messageInput.trim()) return;

    // Verificamos si el cliente está listo
    if (!stompClientRef.current || !stompClientRef.current.connected) {
      alert("El WebSocket no está listo todavía.");
      return;
    }

    const chatMessage = {
      sender: 'Heroe_4',
      content: messageInput,
      type: 'CHAT'
    };

    stompClientRef.current.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify(chatMessage),
    });

    // Limpiamos el input después de enviar con éxito
    setMessageInput('');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>RuneScape Classic Chat - Canal Principal</h2>
      
      <div style={{ marginBottom: '10px', fontSize: '14px' }}>
        Estado: {isConnected ? <span style={{ color: 'green', fontWeight: 'bold' }}>● Conectado</span> : <span style={{ color: 'red', fontWeight: 'bold' }}>● Conectando...</span>}
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
        <button 
          type="submit" 
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

export default Chat;
