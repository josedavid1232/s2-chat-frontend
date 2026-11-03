import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [username, setUsername] = useState('Heroe_' + Math.floor(Math.random() * 1000));
  const [connected, setConnected] = useState(false);
  const stompClientRef = useRef(null);

  // 1. Cargar el historial de mensajes al iniciar la página
  useEffect(() => {
    fetch('https://s2-chat-backend.onrender.com/messages')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch(err => console.error("Error cargando el historial:", err));
  }, []);

  // 2. Configurar la conexión WebSocket en tiempo real
  useEffect(() => {
    const socket = new SockJS('https://s2-chat-backend.onrender.com/ws');
    const stompClient = new Client({
      webSocketFactory: () => socket,
      debug: (str) => {
        console.log(str);
      },
      onConnect: () => {
        setConnected(true);
        stompClient.subscribe('/topic/public', (message) => {
          const newMessage = JSON.parse(message.body);
          setMessages((prevMessages) => [...prevMessages, newMessage]);
        });
      },
      onDisconnect: () => {
        setConnected(false);
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
    if (inputMessage.trim() && stompClientRef.current && connected) {
      const chatMessage = {
        sender: username,
        content: inputMessage,
      };

      stompClientRef.current.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(chatMessage),
      });

      setInputMessage('');
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h2>Chat Global</h2>
        <span className={`status-indicator ${connected ? 'online' : 'offline'}`}>
          {connected ? '● Conectado' : '○ Desconectado'}
        </span>
      </header>

      <div className="user-info">
        <span>Tu apodo actual: <strong>{username}</strong></span>
        <button onClick={() => setUsername('Heroe_' + Math.floor(Math.random() * 1000))}>
          Cambiar
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className="message-item">
            <strong>{msg.sender}: </strong>
            <span>{msg.content}</span>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="chat-form">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Escribe un mensaje y presiona Enviar..."
        />
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}

export default App;
