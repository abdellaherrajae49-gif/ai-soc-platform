import React, { useState, useRef, useEffect } from 'react';
import { askChatbot } from '../api/api';
import { Send, X, Bot, Loader } from 'lucide-react';

interface MessageOption {
  label: string;
  action: string;
  nextStep?: string;
  response?: string;
}

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
  error?: boolean;
  options?: MessageOption[];
}

const DECISION_TREE: Record<string, { text: string; options?: MessageOption[] }> = {
  start: {
    text: '👋 Bonjour ! Je suis votre assistant SOC alimenté par **Mistral 7B**.\n\nQue souhaitez-vous savoir exactement ?',
    options: [
      { label: '📍 Adressage IP & Sites', action: 'adressage', nextStep: 'adressage' },
      { label: '⚙️ Configuration générale', action: 'config', response: "La plateforme utilise un backend Node/Express et un frontend React/Vite. L'IA Mistral tourne localement sur le port 11434 via Ollama." },
      { label: '🧱 Pare-feux (Firewalls)', action: 'firewalls', response: "pfSense 2.6.0 (R-01) gère le routage principal (VMnet0, 2, 3, 4, 5). Il assure le VPN, l'IDS/IPS avec Suricata, et pfBlockerNG." },
      { label: '🛡️ Poser une question libre', action: 'free', response: "Posez-moi n'importe quelle question sur la cybersécurité ou l'infrastructure, je vous écoute !" }
    ]
  },
  adressage: {
    text: 'Quel site ou réseau souhaitez-vous explorer ?',
    options: [
      { label: 'Site A1 — LAN', action: 'site_a1', response: "**Site A1 — LAN**\nRéseau: `192.168.10.0/24`\nPasserelle: `192.168.10.1` (VMnet2)\n- SOC-Center: `192.168.10.10`\n- PC-A1: DHCP `~192.168.10.101`" },
      { label: 'Site A2 — DMZ', action: 'site_a2', response: "**Site A2 — DMZ**\nRéseau: `192.168.20.0/24`\nPasserelle: `192.168.20.1` (VMnet3)\n- Server-Cible: `192.168.20.10`\n- Kali-Red: `192.168.20.50`" },
      { label: 'Site A3 — Secondary', action: 'site_a3', response: "**Site A3 — Secondary**\nRéseau: `192.168.30.0/24`\nPasserelle: `192.168.30.1` (VMnet4)\n- Kali-Blue: `192.168.30.20`\n- PC-A3: DHCP `~192.168.30.100`" },
      { label: 'OpenVPN', action: 'openvpn', response: "**OpenVPN**\nRéseau tunnel: `10.0.0.0/24`\nPasserelle: `10.0.0.1`\nUtilisé pour l'accès distant sécurisé." }
    ]
  }
};

const ChatbotWidget: React.FC = () => {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'bot',
    text: DECISION_TREE['start'].text,
    options: DECISION_TREE['start'].options,
    timestamp: new Date(),
  }]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread]   = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { if (open) { scrollToBottom(); setUnread(0); inputRef.current?.focus(); } }, [open, messages]);

  const handleOptionClick = (opt: MessageOption) => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: opt.label,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    setTimeout(() => {
      let nextMsg: Message;
      if (opt.nextStep && DECISION_TREE[opt.nextStep]) {
        const step = DECISION_TREE[opt.nextStep];
        nextMsg = {
          id: `bot-${Date.now()}`,
          role: 'bot',
          text: step.text,
          options: step.options,
          timestamp: new Date(),
        };
      } else {
        nextMsg = {
          id: `bot-${Date.now()}`,
          role: 'bot',
          text: opt.response || "Compris.",
          timestamp: new Date(),
        };
      }
      setMessages(prev => [...prev, nextMsg]);
      if (!open) setUnread(u => u + 1);
    }, 500);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res  = await askChatbot(trimmed);
      const botMsg: Message = {
        id:        `bot-${Date.now()}`,
        role:      'bot',
        text:      res.data.response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
      if (!open) setUnread(u => u + 1);
    } catch {
      setMessages(prev => [...prev, {
        id:        `err-${Date.now()}`,
        role:      'bot',
        text:      '⚠️ Mistral est actuellement indisponible. Vérifiez qu\'Ollama tourne sur le host Windows (port 11434).',
        timestamp: new Date(),
        error:     true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const renderText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 4px;border-radius:4px;font-family:monospace;">$1</code>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="chatbot-wrapper" id="chatbot-widget">
      {open && (
        <div className="chatbot-window animate-on-scroll is-visible">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar-sm">
                <Bot size={16} />
              </div>
              <div>
                <p className="chatbot-name">Assistant SOC</p>
                <p className="chatbot-status"><span className="status-dot"></span> En ligne - Mistral 7B</p>
              </div>
            </div>
            <button className="chatbot-close" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="chatbot-body">
            {messages.map(msg => (
              <div key={msg.id} className={`chatbot-msg-row ${msg.role === 'user' ? 'msg-right' : 'msg-left'}`}>
                {msg.role === 'bot' && (
                  <div className="chatbot-avatar-xs">
                    <Bot size={14} />
                  </div>
                )}
                <div className="chatbot-msg-content-wrapper">
                  <div className={`chatbot-msg-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-bot'} ${msg.error ? 'bubble-error' : ''}`}>
                    <p dangerouslySetInnerHTML={{ __html: renderText(msg.text) }} />
                  </div>
                  
                  {msg.options && msg.options.length > 0 && (
                    <div className="chatbot-options-container">
                      {msg.options.map((opt, i) => (
                        <button key={i} className="chatbot-option-btn" onClick={() => handleOptionClick(opt)}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <span className="chatbot-msg-time">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chatbot-msg-row msg-left">
                <div className="chatbot-avatar-xs"><Bot size={14} /></div>
                <div className="chatbot-msg-bubble bubble-bot loading-bubble">
                  <Loader size={16} className="spin" />
                  <span>Mistral réfléchit...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-area">
            <input
              ref={inputRef}
              className="chatbot-input"
              type="text"
              placeholder="Posez une question libre..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button className="chatbot-send-btn" onClick={() => send(input)} disabled={!input.trim() || loading}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {!open && (
        <button className="chatbot-fab" onClick={() => setOpen(true)}>
          <Bot size={28} />
          {unread > 0 && <span className="chatbot-badge">{unread}</span>}
        </button>
      )}
    </div>
  );
};

export default ChatbotWidget;
