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
  const [userCount, setUserCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado para la cuenta regresiva (30 minutos = 1800 segundos)
  const [timeLeft, setTimeLeft] = useState(1800);
  
  const stompClientRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Efecto para la cuenta regresiva del temporizador
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 1800; // Reinicia a 30 minutos al llegar a cero
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Función auxiliar para formatear los segundos en formato MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_API_URL || 'https://s2-chat-backend.onrender.com';
    
    // 1. Cargar el historial con manejo de estado de carga
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

    // 2. Configurar la conexión WebSocket
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
      setUsername(tempUsername.trim());
      setIsEditingUsername(false);
    }
  };

  return (
    <div className="chat-container" style={{ padding: '20px', maxWidth: '600px', margin: '20px auto', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
        <h2>Chat Global</h2>
        
        <div style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', background: '#161b22', padding: '6px 12px', borderRadius: '20px', border: '1px solid #30363d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              height: '10px',
              width: '10px',
              backgroundColor: '#238636',
              borderRadius: '50%',
              display: 'inline-block'
            }}></span>
            <span style={{ color: '#3fb950', fontWeight: 'bold' }}>
              {userCount} {userCount === 1 ? 'conectado' : 'conectados'}
            </span>
          </div>
          <span style={{ color: '#8b949e', borderLeft: '1px solid #30363d', paddingLeft: '10px' }}>
            🧹 Limpieza: <strong style={{ color: '#c9d1d9' }}>{formatTime(timeLeft)}</strong>
          </span>
        </div>
      </div>
      
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

      {/* Ventana de mensajes con indicador de carga y limitación de visualización */}
      <div className="chat-box" style={{ height: '350px', border: '1px solid #30363d', overflowY: 'scroll', padding: '12px', background: '#010409', marginBottom: '10px', display: 'flex', flexDirection: 'column', justifyContent: isLoading ? 'center' : 'flex-start', alignItems: isLoading ? 'center' : 'stretch' }}>
        {isLoading ? (
          <div style={{ color: '#8b949e', textAlign: 'center' }}>
            <p>⏳ Conectando con el servidor (despertando Render)...</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ color: '#8b949e', textAlign: 'center', marginTop: '120px' }}>
            No hay mensajes aún. ¡Sé el primero en escribir!
          </div>
        ) : (
          messages.slice(-50).map((msg, index) => (
            <div key={index} style={{ marginBottom: '8px', wordBreak: 'break-word' }}>
              <span style={{ color: '#ff5555', fontWeight: 'bold' }}>
                {msg.sender}:
              </span>{' '}
              <span style={{ color: '#c9d1d9' }}>{msg.content}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

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
