import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  
  // Nombre de usuario personalizable
  const [username, setUsername] = useState(() => 'Heroe_' + Math.floor(Math.random() * 1000));
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(username);

  const stompClientRef = useRef(null);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    // URL dinámica que apunta al backend en Render
    const backendUrl = `${import.meta.env.VITE_API_URL || 'https://s2-chat-backend.onrender.com'}/ws-chat`;

    const socket = new SockJS(backendUrl);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('Conectado al chat de RuneScape');
        // Suscripción al tópico donde el backend retransmite los mensajes
        stompClient.subscribe('/topic/messages', (sdkEvent) => {
          if (sdkEvent.body) {
            const receivedMessage = JSON.parse(sdkEvent.body);
            setMessages((prevMessages) => [...prevMessages, receivedMessage]);
          }
        });
      },
      onStompError: (frame) => {
        console.error('Error STOMP:', frame.headers['message']);
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

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (inputMessage.trim() && stompClientRef.current && stompClientRef.current.connected) {
      // Objeto de mensaje estándar para Spring Boot
      const chatMessage = {
        sender: username,
        content: inputMessage.trim(),
        type: 'CHAT'
      };

      stompClientRef.current.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(chatMessage)
      });

      setInputMessage('');
    } else if (!stompClientRef.current?.connected) {
      console.warn('El WebSocket no está conectado aún.');
    }
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      setUsername(tempName.trim());
      setIsEditingName(false);
    }
  };

  return (
    <div className="chat-container" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h2>RuneScape Classic Chat - Canal Principal</h2>

      {/* Control de Nombre de Usuario */}
      <div style={{ marginBottom: '15px', background: '#222', padding: '10px', borderRadius: '5px' }}>
        <span style={{ color: '#aaa' }}>Tu Nombre: </span>
        {isEditingName ? (
          <>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              maxLength={15}
              style={{ padding: '3px 6px', marginRight: '5px' }}
            />
            <button onClick={handleSaveName} style={{ cursor: 'pointer' }}>Guardar</button>
          </>
        ) : (
          <>
            <strong style={{ color: '#00ff00', fontSize: '1.1em' }}>{username}</strong>
            <button 
              onClick={() => { setTempName(username); setIsEditingName(true); }} 
              style={{ marginLeft: '10px', cursor: 'pointer', fontSize: '0.8em' }}
            >
              Cambiar
            </button>
          </>
        )}
      </div>

      {/* Caja de Mensajes */}
      <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #444', padding: '10px', background: '#111', textAlign: 'left' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '5px' }}>
            <span style={{ color: '#ff9900', fontWeight: 'bold' }}>{msg.sender || msg.username || 'Anónimo'}: </span>
            <span style={{ color: '#fff' }}>{msg.content || msg.message}</span>
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>

      {/* Formulario de Envío */}
      <form onSubmit={sendMessage} style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          style={{ flex: 1, padding: '8px' }}
        />
        <button type="submit" style={{ padding: '8px 15px', cursor: 'pointer' }}>Enviar</button>
      </form>
    </div>
  );
}
