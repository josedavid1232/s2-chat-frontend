import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const stompClientRef = useRef(null);

  useEffect(() => {
    // Usamos el protocolo wss:// directamente para evitar demoras con transportes alternativos
    const stompClient = new Client({
      brokerURL: 'wss://s2-chat-backend.onrender.com/ws',
      reconnectDelay: 3000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('¡Conectado al WebSocket con éxito!');
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
    
    if (!isConnected || !stompClientRef.current) {
      alert("El WebSocket no está conectado. Espera un segundo a que establezca enlace.");
      return;
    }

    if (messageInput.trim() === '') return;

    const chatMessage = {
      sender: 'Heroe_4',
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
