import React, { useEffect, useState } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

export default function ChatComponent() {
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [stompClient, setStompClient] = useState(null);
    const [username, setUsername] = useState('Heroe_4'); // O el nombre que uses en tu app

    useEffect(() => {
        // 1. Conexión con SockJS al backend en Render
        const socket = new SockJS('https://s2-chat-backend.onrender.com/ws');
        const client = Stomp.over(socket);

        client.connect({}, (frame) => {
            console.log('¡Conectado al WebSocket con SockJS!');

            // 2. Suscripción al canal de difusión del backend
            client.subscribe('/topic/public', (payload) => {
                const receivedMessage = JSON.parse(payload.body);
                // Agrega el mensaje recibido al estado para que se pinte en pantalla
                setMessages((prevMessages) => [...prevMessages, receivedMessage]);
            });

        }, (error) => {
            console.error('Error de conexión WebSocket:', error);
        });

        setStompClient(client);

        // Cleanup al desmontar el componente
        return () => {
            if (client && client.connected) {
                client.disconnect();
            }
        };
    }, []);

    // 3. Función para enviar el mensaje al backend
    const sendMessage = (e) => {
        e.preventDefault();
        if (messageInput.trim() && stompClient && stompClient.connected) {
            const chatMessage = {
                sender: username,
                content: messageInput,
                type: 'CHAT'
            };

            console.log('Intentando enviar mensaje:', chatMessage);
            
            // Envía el mensaje al @MessageMapping("/chat.sendMessage") del backend
            stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
            
            // Limpia el input de texto
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
