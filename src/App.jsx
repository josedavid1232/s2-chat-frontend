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

  const handleSendMessage = (e) => {
    // 🛡️ Evitamos que la página se recargue o se comporte raro al presionar Enter
    if (e) e.preventDefault();

    if (!messageInput.trim()) return;

    if (!stompClientRef.current || !stompClientRef.current.connected) {
      alert("El WebSocket no está conectado en este momento.");
      return;
    }

    const chatMessage = {
      sender: 'Heroe_4',
      content: messageInput.trim(),
      type: 'CHAT'
    };

    // Publicamos el mensaje al destino configurado en el backend
    stompClientRef.current.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify(chatMessage),
    });

    // Limpiamos el input después de enviar correctamente
    setMessageInput('');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>RuneScape Classic Chat - Canal Principal</h2>
      
      <div style={{ marginBottom: '10px', fontSize: '14px' }}>
        Estado: {isConnected ? <span style={{ color: 'green', fontWeight: 'bold' }}>● Conectado</span> : <span style={{ color: 'red', fontWeight: 'bold' }}>● Conectando...</span>}
      </div>

      {/* Cuadro donde se muestran los mensajes del chat */}
      <div style={{ background: '#111', color: '#fff', height: '300px', overflowY: 'scroll', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '6px' }}>
            <b style={{ color: '#ffcc00' }}>{msg.sender}:</b> {msg.content}
          </div>
        ))}
      </div>

      {/* Formulario que atrapa tanto el botón como la tecla Enter */}
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Escribe un mensaje y presiona Enter..."
          style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button 
          type="submit" 
          style={{ padding: '10px 20px', cursor: 'pointer', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

export default Chat;
