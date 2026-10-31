import React, { useEffect, useState } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

export default function App() {
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [stompClient, setStompClient] = useState(null);
    const [username, setUsername] = useState('Heroe_4');

    useEffect(() => {
        // Inicialización optimizada con fábrica de sockets para evitar advertencias
        const client = Stomp.client('https://s2-chat-backend.onrender.com/ws');
        client.webSocketFactory = () => new SockJS('https://s2-chat-backend.onrender.com/ws');

        client.onConnect = (frame) => {
            console.log('¡Conectado al WebSocket con SockJS!');

            // Suscripción al canal de difusión del backend
            client.subscribe('/topic/public', (payload) => {
                const receivedMessage = JSON.parse(payload.body);
                setMessages((prevMessages) => [...prevMessages, receivedMessage]);
            });
        };

        client.onStompError = (error) => {
            console.error('Error en protocolo STOMP:', error);
        };

        client.activate();
        setStompClient(client);

        // Cleanup al desmontar
        return () => {
            if (client) {
                client.deactivate();
            }
        };
    }, []);

    // Función para enviar el mensaje al backend
    const sendMessage = (e) => {
        e.preventDefault();
        if (messageInput.trim() && stompClient && stompClient.connected) {
            const chatMessage = {
                sender: username,
                content: messageInput,
                type: 'CHAT'
            };

            console.log('Intentando enviar mensaje:', chatMessage);
            
            stompClient.publish({
                destination: '/app/chat.sendMessage',
                body: JSON.stringify(chatMessage)
            });
            
            setMessageInput('');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h2>RuneScape Classic Chat - Canal Principal</h2>
            
            {/* Caja donde se muestran los mensajes */}
            <div style={{ 
                border: '1px solid #ccc', 
                height: '300px', 
                overflowY: 'scroll', 
                padding: '10px', 
                marginBottom: '10px',
                backgroundColor: '#111',
                color: '#fff',
                textAlign: 'left'
            }}>
                {messages.map((msg, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                        <strong>{msg.sender}: </strong>
                        <span>{msg.content}</span>
                    </div>
                ))}
            </div>

            {/* Formulario para escribir y enviar */}
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
                <input 
                    type="text" 
                    value={messageInput} 
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Escribe un mensaje y presiona Enviar..." 
                    style={{ flex: 1, padding: '8px' }}
                />
                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#007bff', color: '#fff', border: 'none' }}>
                    Enviar
                </button>
            </form>
        </div>
    );
}
