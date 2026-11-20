import React, { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import './App.css';

// Función para generar un color consistente basado en el apodo (respaldo si no hay color elegido)
const getUserColor = (name) => {
  if (!name) return '#ff5555';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#ff5555', '#58a6ff', '#3fb950', '#d29922',
    '#bc8cff', '#f778ba', '#79c0ff', '#56d364', '#e3b341'
  ];
  return colors[Math.abs(hash) % colors.length];
};

// Conversión HEX <-> RGB
const hexToRgb = (hex) => {
  const clean = (hex || '#5823cd').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return { r: 88, g: 166, b: 255 };
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
};

const rgbToHex = (r, g, b) => {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(Number(n) || 0)));
  const toHex = (n) => clamp(n).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Función helper para transformar texto con URLs en componentes con <a> clickeables
const renderMessageContent = (content) => {
  if (!content) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#58a6ff', textDecoration: 'underline', wordBreak: 'break-all' }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

// Panel flotante tipo tarjeta inspirado en el Color Picker
function CustomColorPickerCard({ color, onChangeColor, onClose }) {
  const initialRgb = hexToRgb(color);
  const [hexInput, setHexInput] = useState((color || '#5823CD').toUpperCase());
  const [rgb, setRgb] = useState(initialRgb);
  const [hue, setHue] = useState(260);
  const [sat, setSat] = useState(80);
  const [val, setVal] = useState(80);
  const [sliderPos, setSliderPos] = useState(85);

  const ringRef = useRef(null);
  const innerRef = useRef(null);
  const barRef = useRef(null);

  useEffect(() => {
    const parsed = hexToRgb(color);
    setRgb(parsed);
    setHexInput((color || '#5823CD').toUpperCase());
  }, [color]);

  const applyRgbAndHex = (r, g, b) => {
    const nextRgb = {
      r: Math.max(0, Math.min(255, Math.round(r))),
      g: Math.max(0, Math.min(255, Math.round(g))),
      b: Math.max(0, Math.min(255, Math.round(b))),
    };
    const nextHex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    setRgb(nextRgb);
    setHexInput(nextHex);
    onChangeColor(nextHex);
  };

  const hsvToRgb = (h, s, v) => {
    const sn = s / 100;
    const vn = v / 100;
    const c = vn * sn;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = vn - c;
    let r1 = 0, g1 = 0, b1 = 0;

    if (h >= 0 && h < 60) { r1 = c; g1 = x; b1 = 0; }
    else if (h >= 60 && h < 120) { r1 = x; g1 = c; b1 = 0; }
    else if (h >= 120 && h < 180) { r1 = 0; g1 = c; b1 = x; }
    else if (h >= 180 && h < 240) { r1 = 0; g1 = x; b1 = c; }
    else if (h >= 240 && h < 300) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }

    return {
      r: (r1 + m) * 255,
      g: (g1 + m) * 255,
      b: (b1 + m) * 255,
    };
  };

  const handleRingSelect = (e) => {
    const rect = ringRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;
    const nextHue = Math.round(angle) % 360;
    setHue(nextHue);
    const nextRgb = hsvToRgb(nextHue, sat, val);
    applyRgbAndHex(nextRgb.r, nextRgb.g, nextRgb.b);
  };

  const handleInnerSelect = (e) => {
    const rect = innerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xRel = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const yRel = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const nextSat = Math.round(xRel * 100);
    const nextVal = Math.round((1 - yRel) * 100);
    setSat(nextSat);
    setVal(nextVal);
    const nextRgb = hsvToRgb(hue, nextSat, nextVal);
    applyRgbAndHex(nextRgb.r, nextRgb.g, nextRgb.b);
  };

  const handleSliderSelect = (e) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setSliderPos(Math.round(ratio * 100));
    const factor = 0.35 + ratio * 0.65;
    applyRgbAndHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
  };

  const handleHexChange = (e) => {
    let valStr = e.target.value.toUpperCase();
    if (!valStr.startsWith('#')) valStr = '#' + valStr.replace('#', '');
    setHexInput(valStr);
    if (/^#[0-9A-F]{6}$/.test(valStr)) {
      const parsed = hexToRgb(valStr);
      setRgb(parsed);
      onChangeColor(valStr);
    }
  };

  const handleRgbInput = (channel, raw) => {
    const next = { ...rgb, [channel]: raw };
    setRgb(next);
    const nextHex = rgbToHex(next.r, next.g, next.b);
    setHexInput(nextHex);
    onChangeColor(nextHex);
  };

  const pureHueHex = rgbToHex(
    hsvToRgb(hue, 100, 100).r,
    hsvToRgb(hue, 100, 100).g,
    hsvToRgb(hue, 100, 100).b
  );

  const ringRad = ((hue - 90) * Math.PI) / 180;
  const ringKnobX = 88 + Math.cos(ringRad) * 72;
  const ringKnobY = 88 + Math.sin(ringRad) * 72;

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        left: '0',
        marginTop: '8px',
        width: '250px',
        backgroundColor: '#ffffff',
        color: '#111827',
        borderRadius: '18px',
        padding: '16px',
        boxShadow: '0 18px 40px rgba(0, 0, 0, 0.45)',
        border: '1px solid rgba(17, 24, 39, 0.08)',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '18px', fontWeight: 500, letterSpacing: '-0.02em' }}>
          Color Picker
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: '999px',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
          title="Cerrar"
        >
          ✕
        </button>
      </div>

      {/* Rueda cromática + círculo interior */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
        <div
          ref={ringRef}
          onClick={handleRingSelect}
          style={{
            position: 'relative',
            width: '176px',
            height: '176px',
            borderRadius: '50%',
            background:
              'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'crosshair',
          }}
        >
          <div
            style={{
              width: '126px',
              height: '126px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              ref={innerRef}
              onClick={(e) => {
                e.stopPropagation();
                handleInnerSelect(e);
              }}
              style={{
                position: 'relative',
                width: '112px',
                height: '112px',
                borderRadius: '50%',
                background: `radial-gradient(circle at 80% 25%, ${pureHueHex}, #3b3b45 65%, #18181b 100%)`,
                pointerEvents: 'auto',
                cursor: 'crosshair',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: `${sat}%`,
                  top: `${100 - val}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  border: '2px solid #ffffff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          <span
            style={{
              position: 'absolute',
              left: `${ringKnobX}px`,
              top: `${ringKnobY}px`,
              transform: 'translate(-50%, -50%)',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: color,
              border: '3px solid #ffffff',
              boxShadow: '0 4px 10px rgba(0,0,0,0.28)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* Barra deslizante inferior */}
      <div style={{ marginBottom: '14px' }}>
        <div
          ref={barRef}
          onClick={handleSliderSelect}
          style={{
            position: 'relative',
            height: '14px',
            borderRadius: '4px',
            background: `linear-gradient(90deg, rgba(209,213,219,0.7), ${color})`,
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: `${sliderPos}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: color,
              border: '2px solid #ffffff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
            }}
          />
        </div>
      </div>

      {/* Campos HEX, R, G, B */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.35fr 1fr 1fr 1fr',
          gap: '6px',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '10px',
          textAlign: 'center',
        }}
      >
        <div>
          <input
            type="text"
            value={hexInput}
            onChange={handleHexChange}
            maxLength={7}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#e5e7eb',
              color: '#111827',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 4px',
              fontSize: '11px',
              fontWeight: 600,
              textAlign: 'center',
            }}
          />
          <div style={{ fontSize: '11px', color: '#374151', marginTop: '4px', fontWeight: 600 }}>#</div>
        </div>

        {['r', 'g', 'b'].map((ch) => (
          <div key={ch}>
            <input
              type="number"
              min={0}
              max={255}
              value={rgb[ch]}
              onChange={(e) => handleRgbInput(ch, e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#f3f4f6',
                color: '#111827',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 2px',
                fontSize: '11px',
                textAlign: 'center',
              }}
            />
            <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '4px' }}>
              {ch.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const backendUrl = import.meta.env.VITE_API_URL || 'https://s2-chat-backend.onrender.com';

  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');

  // Apodo bloqueado guardado en localStorage (persiste al recargar con F5)
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('chat_locked_username') || '';
  });

  // Color elegido por el usuario (persiste en localStorage y en MySQL)
  const [userColor, setUserColor] = useState(() => {
    const savedColor = localStorage.getItem('chat_user_color');
    if (savedColor) return savedColor;
    const savedName = localStorage.getItem('chat_locked_username');
    return savedName ? getUserColor(savedName) : '#58a6ff';
  });

  // Mapa de colores de usuarios bloqueados: { "josexx": "#d29922", ... }
  const [userColors, setUserColors] = useState({});

  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [tempColor, setTempColor] = useState(userColor);
  const [usernameError, setUsernameError] = useState('');
  const [isUsernameLoading, setIsUsernameLoading] = useState(false);

  const [userCount, setUserCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Estado para la edición de mensajes y menú de 3 puntos
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);

  const stompClientRef = useRef(null);
  const messagesEndRef = useRef(null);

  const resolveSenderColor = (senderName) => {
    if (!senderName) return '#ff5555';
    if (username && senderName.trim().toLowerCase() === username.trim().toLowerCase()) {
      return userColor;
    }
    const mapped = userColors[senderName.trim().toLowerCase()];
    return mapped || getUserColor(senderName);
  };

  const fetchLockedColors = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/usernames/locked`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setUserColors(data);
        if (username) {
          const ownColor = data[username.trim().toLowerCase()];
          if (ownColor && !localStorage.getItem('chat_user_color')) {
            setUserColor(ownColor);
            setTempColor(ownColor);
            localStorage.setItem('chat_user_color', ownColor);
          }
        }
      }
    } catch (err) {
      console.error('Error cargando colores bloqueados:', err);
    }
  };

  const lockUsernameOnServer = async (candidateName, chosenColor, updateColor = false) => {
    const res = await fetch(`${backendUrl}/api/usernames/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: candidateName,
        color: chosenColor,
        updateColor: updateColor ? 'true' : 'false',
      }),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  };

  const releaseUsernameOnServer = async (nameToRelease) => {
    if (!nameToRelease) return;
    await fetch(`${backendUrl}/api/usernames/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: nameToRelease }),
    });
  };

  const handleColorChange = async (newColor) => {
    setUserColor(newColor);
    setTempColor(newColor);
    localStorage.setItem('chat_user_color', newColor);

    if (username) {
      setUserColors((prev) => ({
        ...prev,
        [username.trim().toLowerCase()]: newColor,
      }));
      try {
        await lockUsernameOnServer(username, newColor, true);
      } catch (err) {
        console.error('Error guardando color en el servidor:', err);
      }
    }
  };

  useEffect(() => {
    if (username) return;

    let cancelled = false;
    const initDefaultUsername = async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = 'Heroe_' + Math.floor(100 + Math.random() * 900);
        const initialColor = localStorage.getItem('chat_user_color') || getUserColor(candidate);
        try {
          const { ok, data } = await lockUsernameOnServer(candidate, initialColor, false);
          if (cancelled) return;
          if (ok && data.username) {
            const assignedColor = data.color || initialColor;
            setUsername(data.username);
            setUserColor(assignedColor);
            setTempColor(assignedColor);
            localStorage.setItem('chat_locked_username', data.username);
            localStorage.setItem('chat_user_color', assignedColor);
            setUserColors((prev) => ({
              ...prev,
              [data.username.trim().toLowerCase()]: assignedColor,
            }));
            return;
          }
        } catch (err) {
          console.error('Error bloqueando apodo inicial:', err);
          break;
        }
      }
      if (!cancelled) {
        setIsEditingUsername(true);
        setUsernameError('Elige un apodo disponible para entrar.');
      }
    };

    initDefaultUsername();
    return () => {
      cancelled = true;
    };
  }, [username, backendUrl]);

  useEffect(() => {
    fetchLockedColors();

    fetch(`${backendUrl}/messages`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando el historial:', err);
        setIsLoading(false);
      });

    const socketFactory = () => new SockJS(`${backendUrl}/ws`);

    const client = new Client({
      webSocketFactory: socketFactory,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('Conectado al WebSocket');
        fetchLockedColors();

        client.subscribe('/topic/public', (message) => {
          const receivedMessage = JSON.parse(message.body);

          setMessages((prevMessages) => {
            if (receivedMessage.type === 'DELETE') {
              return prevMessages.filter((m) => m.id !== undefined && m.id !== receivedMessage.id);
            }

            const existsIndex = prevMessages.findIndex(
              (m) => m.id !== undefined && m.id === receivedMessage.id
            );
            if (existsIndex !== -1) {
              const updated = [...prevMessages];
              updated[existsIndex] = receivedMessage;
              return updated;
            }
            return [...prevMessages, receivedMessage];
          });
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
  }, [backendUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !username) return;

    if (stompClientRef.current && stompClientRef.current.connected) {
      const chatMessage = {
        sender: username,
        content: messageInput,
        type: 'CHAT',
      };

      stompClientRef.current.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(chatMessage),
      });

      setMessageInput('');
    }
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    const cleanName = tempUsername.trim();
    if (!cleanName) {
      setUsernameError('El apodo no puede estar vacío.');
      return;
    }

    const chosenColor = tempColor || userColor || getUserColor(cleanName);

    if (username && cleanName.toLowerCase() === username.toLowerCase()) {
      setUsername(cleanName);
      setUserColor(chosenColor);
      localStorage.setItem('chat_locked_username', cleanName);
      localStorage.setItem('chat_user_color', chosenColor);
      setUserColors((prev) => ({
        ...prev,
        [cleanName.toLowerCase()]: chosenColor,
      }));
      await lockUsernameOnServer(cleanName, chosenColor, true);
      setUsernameError('');
      setIsEditingUsername(false);
      return;
    }

    setIsUsernameLoading(true);
    setUsernameError('');

    try {
      const { ok, data } = await lockUsernameOnServer(cleanName, chosenColor, false);
      if (!ok) {
        setUsernameError(data.error || 'Ese nombre ya está bloqueado por otro usuario.');
        setIsUsernameLoading(false);
        return;
      }

      const previousName = username;
      if (previousName) {
        await releaseUsernameOnServer(previousName);
      }

      const confirmedColor = data.color || chosenColor;
      setUsername(data.username);
      setUserColor(confirmedColor);
      localStorage.setItem('chat_locked_username', data.username);
      localStorage.setItem('chat_user_color', confirmedColor);
      setUserColors((prev) => {
        const next = { ...prev };
        if (previousName) {
          delete next[previousName.trim().toLowerCase()];
        }
        next[data.username.trim().toLowerCase()] = confirmedColor;
        return next;
      });
      setIsEditingUsername(false);
      setTempUsername('');
    } catch (err) {
      console.error('Error al bloquear apodo:', err);
      setUsernameError('No se pudo validar el apodo con el servidor.');
    } finally {
      setIsUsernameLoading(false);
    }
  };

  const handleReleaseUsername = async () => {
    if (!username) return;
    setIsUsernameLoading(true);
    setUsernameError('');
    setIsColorPickerOpen(false);

    try {
      await releaseUsernameOnServer(username);
      const releasedKey = username.trim().toLowerCase();
      localStorage.removeItem('chat_locked_username');
      setUserColors((prev) => {
        const next = { ...prev };
        delete next[releasedKey];
        return next;
      });
      setUsername('');
      setTempUsername('');
      setIsEditingUsername(true);
    } catch (err) {
      console.error('Error al quitar apodo:', err);
      setUsernameError('No se pudo liberar el apodo. Intenta de nuevo.');
    } finally {
      setIsUsernameLoading(false);
    }
  };

  const saveEditedMessage = (msgId, index) => {
    if (!editingText.trim()) return;

    const targetMessage = messages.find((m) => m.id === msgId || messages.indexOf(m) === index);
    const identifier = targetMessage ? (targetMessage.id !== undefined ? targetMessage.id : index) : msgId;

    if (stompClientRef.current && stompClientRef.current.connected) {
      const editPayload = {
        id: identifier,
        sender: username,
        content: editingText.trim(),
        edited: true,
        type: 'EDIT',
      };

      stompClientRef.current.publish({
        destination: '/app/chat.editMessage',
        body: JSON.stringify(editPayload),
      });

      setMessages((prev) =>
        prev.map((m, idx) =>
          m.id === identifier || idx === index
            ? { ...m, content: editingText.trim(), edited: true }
            : m
        )
      );

      setEditingMessageId(null);
      setEditingText('');
      setActiveMenuId(null);
    }
  };

  const deleteMessage = (msgId) => {
    if (msgId === undefined || msgId === null) return;

    if (stompClientRef.current && stompClientRef.current.connected) {
      const deletePayload = {
        id: msgId,
        sender: username,
        type: 'DELETE',
      };

      stompClientRef.current.publish({
        destination: '/app/chat.deleteMessage',
        body: JSON.stringify(deletePayload),
      });

      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      setActiveMenuId(null);
    }
  };

  return (
    <div className="chat-container">
      {/* Cabecera unificada y moderna */}
      <div className="chat-header-bar">
        <h2>Chat Global</h2>

        <div className="status-pill">
          <span
            style={{
              height: '8px',
              width: '8px',
              backgroundColor: '#238636',
              borderRadius: '50%',
              display: 'inline-block',
              boxShadow: '0 0 8px #238636',
            }}
          ></span>
          <span style={{ color: '#3fb950', fontWeight: 'bold' }}>
            {userCount} {userCount === 1 ? 'conectado' : 'conectados'}
          </span>
          <span
            style={{
              color: '#8b949e',
              borderLeft: '1px solid #30363d',
              paddingLeft: '8px',
              fontSize: '11px',
            }}
          >
            🧹 30 min
          </span>
        </div>
      </div>

      {/* Barra de perfil / Apodo bloqueado + Botón Color Picker */}
      <div
        className="user-profile-bar"
        style={{ position: 'relative', flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}
      >
        {!isEditingUsername ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              fontSize: '13px',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>
                Tu apodo bloqueado:{' '}
                <strong style={{ color: userColor }}>
                  {username || 'Asignando...'}
                </strong>
              </span>

              <button
                type="button"
                disabled={isUsernameLoading || !username}
                onClick={() => setIsColorPickerOpen((prev) => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 9px',
                  cursor: 'pointer',
                  background: '#161b22',
                  color: '#e6edf3',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              >
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: userColor,
                    border: '1px solid rgba(255,255,255,0.4)',
                    display: 'inline-block',
                  }}
                />
                Color
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                disabled={isUsernameLoading || !username}
                onClick={() => {
                  setTempUsername(username);
                  setTempColor(userColor);
                  setUsernameError('');
                  setIsColorPickerOpen(false);
                  setIsEditingUsername(true);
                }}
                style={{
                  padding: '4px 10px',
                  cursor: 'pointer',
                  background: '#238636',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              >
                Cambiar apodo
              </button>
              <button
                type="button"
                disabled={isUsernameLoading || !username}
                onClick={handleReleaseUsername}
                style={{
                  padding: '4px 10px',
                  cursor: 'pointer',
                  background: '#da3633',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              >
                Quitar apodo
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUsernameSubmit} style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
            <input
              type="text"
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              placeholder="Escribe un apodo para bloquearlo..."
              disabled={isUsernameLoading}
              style={{
                flex: 1,
                padding: '6px 10px',
                background: '#080d17',
                color: 'white',
                border: '1px solid #30363d',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => setIsColorPickerOpen((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                cursor: 'pointer',
                background: '#161b22',
                color: 'white',
                border: '1px solid #30363d',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: tempColor,
                  display: 'inline-block',
                }}
              />
              Color
            </button>
            <button
              type="submit"
              disabled={isUsernameLoading}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                background: '#238636',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            >
              {isUsernameLoading ? '...' : 'Bloquear'}
            </button>
            {username && (
              <button
                type="button"
                disabled={isUsernameLoading}
                onClick={() => {
                  setIsEditingUsername(false);
                  setIsColorPickerOpen(false);
                  setUsernameError('');
                }}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  background: '#30363d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              >
                Cancelar
              </button>
            )}
          </form>
        )}

        {isColorPickerOpen && (
          <CustomColorPickerCard
            color={isEditingUsername ? tempColor : userColor}
            onChangeColor={(nextHex) => {
              if (isEditingUsername) {
                setTempColor(nextHex);
              } else {
                handleColorChange(nextHex);
              }
            }}
            onClose={() => setIsColorPickerOpen(false)}
          />
        )}

        {usernameError && (
          <div style={{ color: '#f85149', fontSize: '12px' }}>
            ⚠️ {usernameError}
          </div>
        )}
      </div>

      {/* Caja de mensajes */}
      <div className="chat-box">
        {isLoading ? (
          <div style={{ color: '#8b949e', textAlign: 'center', margin: 'auto' }}>
            <p>⏳ Conectando al servidor...</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ color: '#8b949e', textAlign: 'center', margin: 'auto', fontSize: '13px' }}>
            No hay mensajes aún. ¡Sé el primero en escribir!
          </div>
        ) : (
          messages.slice(-50).map((msg, index) => {
            const isMyMessage = msg.sender === username;
            const messageKey = msg.id !== undefined ? msg.id : index;
            const isEditingThis = editingMessageId === messageKey;
            const isMenuOpen = activeMenuId === messageKey;
            const senderColor = resolveSenderColor(msg.sender);

            return (
              <div key={messageKey} className={`chat-message ${isMyMessage ? 'mine' : ''}`}>
                <div className="user-avatar" style={{ backgroundColor: senderColor }}>
                  {msg.sender ? msg.sender.charAt(0).toUpperCase() : '?'}
                </div>

                <div className="message-bubble">
                  <div
                    style={{
                      wordBreak: 'break-word',
                      paddingRight: isMyMessage && !isEditingThis ? '35px' : '0',
                    }}
                  >
                    <span
                      style={{
                        color: senderColor,
                        fontWeight: 'bold',
                        marginRight: '6px',
                        fontSize: '13px',
                      }}
                    >
                      {msg.sender}:
                    </span>

                    {isEditingThis ? (
                      <div style={{ display: 'inline-flex', gap: '6px', marginTop: '4px' }}>
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          style={{
                            padding: '4px 8px',
                            background: '#161b22',
                            color: 'white',
                            border: '1px solid #30363d',
                            borderRadius: '4px',
                            fontSize: '13px',
                          }}
                        />
                        <button
                          onClick={() => saveEditedMessage(msg.id, index)}
                          style={{
                            padding: '4px 8px',
                            background: '#238636',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setEditingMessageId(null)}
                          style={{
                            padding: '4px 8px',
                            background: '#30363d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#c9d1d9', fontSize: '13px' }}>
                        {renderMessageContent(msg.content)}
                        {msg.edited && (
                          <span style={{ color: '#8b949e', fontSize: '10px', marginLeft: '6px' }}>
                            (editado)
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  {isMyMessage && !isEditingThis && (
                    <div className="message-actions-container">
                      <button
                        onClick={() => setActiveMenuId(isMenuOpen ? null : messageKey)}
                        className="menu-trigger-btn"
                        title="Opciones"
                      >
                        ⋮
                      </button>

                      {isMenuOpen && (
                        <div className="dropdown-menu">
                          <button
                            className="dropdown-item"
                            onClick={() => {
                              setEditingMessageId(messageKey);
                              setEditingText(msg.content);
                              setActiveMenuId(null);
                            }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            className="dropdown-item delete"
                            onClick={() => deleteMessage(msg.id)}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulario de envío */}
      <form onSubmit={sendMessage} className="chat-input-form">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Escribe un mensaje o comparte una URL..."
          disabled={!username}
        />
        <button type="submit" className="chat-send-btn" disabled={!username}>
          Enviar
        </button>
      </form>
    </div>
  );
}

export default App;
