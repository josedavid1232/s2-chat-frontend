import React, { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import './App.css';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [username] = useState(() => 'Heroe_' + Math.floor(Math.random() * 1000));
  const stompClientRef = useRef(null);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    // URL activa de Cloudflare para el backend (puerto 8080)
    const backendUrl = 'https://explain-man-recommended-purchased.trycloudflare.com/ws-chat';

    const socket = new SockJS(backendUrl);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        console.log('Conectado al chat de RuneScape');
        stompClient.subscribe('/topic/messages', (sdkEvent) => {
          const receivedMessage = JSON.parse(sdkEvent.body);
          setMessages((prevMessages) => [...prevMessages, receivedMessage]);
        });
      },
      onStompError: (frame) => {
        console.error('Error en STOMP:', frame);
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

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!stompClientRef.current || !stompClientRef.current.connected) {
      console.warn('El WebSocket aún no está conectado al backend.');
      return;
    }

    if (inputMessage.trim() !== '') {
      const chatMessage = {
        sender: username,
        content: inputMessage,
        type: 'CHAT'
      };

      stompClientRef.current.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(chatMessage)
      });

      setInputMessage('');
    }
  };

  return (
      <div className="chat-container">
        <div className="chat-header">
          RuneScape Classic Chat - Canal Principal
        </div>

        <div className="chat-box">
          {messages.map((msg, index) => (
              <div key={index} className="chat-message">
                <span className="username">{msg.sender}: </span>
                <span className="text">{msg.content}</span>
              </div>
          ))}
          <div ref={chatBottomRef} />
        </div>

        <form onSubmit={handleSendMessage} className="input-container">
          <input
              type="text"
              placeholder="Escribe un mensaje..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              autoFocus
          />
          <button type="submit">Enviar</button>
        </form>
      </div>
  );
}