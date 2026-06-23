import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen, ShieldAlert, Wifi, Smartphone, ChevronRight, ChevronDown,
  GraduationCap, Brain, MessageCircle, CheckCircle, AlertTriangle,
  Lock, Eye, Zap, Award, ArrowRight, Send, Bot, User, Loader,
} from 'lucide-react';
import { COURSES, DEFAULT_COURSE } from '../data/courses';
import type { Course } from '../data/courses';
import { askChatbot } from '../api/api';

/* ── Topic tree ─────────────────────────────────────────────────────────────── */
const TOPICS = [
  {
    category: 'Attaques Réseau',
    icon: <Wifi size={18} style={{ color: 'var(--accent-cyan)' }} />,
    items: [
      { id: 'ARP Spoofing',   label: 'ARP Spoofing' },
      { id: 'MITM',           label: 'Man in the Middle' },
      { id: 'Network Sniffing', label: 'Écoute Passive (Sniffing)' },
      { id: 'DNS Poisoning',  label: 'DNS Poisoning' },
    ]
  },
  {
    category: 'Attaques Web',
    icon: <ShieldAlert size={18} style={{ color: 'var(--accent-red)' }} />,
    items: [
      { id: 'Cross-Site Scripting (XSS)', label: 'XSS' },
      { id: 'SQL Injection (SQLi)',       label: 'Injection SQL' },
    ]
  },
  {
    category: 'Sécurité Mobile',
    icon: <Smartphone size={18} style={{ color: 'var(--accent-green)' }} />,
    items: [
      { id: 'Insecure Data Storage', label: 'Stockage Non Sécurisé' },
    ]
  }
];

/* ── Mini-chatbot for quiz ──────────────────────────────────────────────────── */
interface QMsg { role: 'user' | 'bot'; text: string; }

const QuizChat: React.FC<{ course: Course }> = ({ course }) => {
  const [messages, setMessages] = useState<QMsg[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [started, setStarted]   = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: QMsg = { role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await askChatbot(text.trim());
      setMessages(prev => [...prev, { role: 'bot', text: res.data.response }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: '⚠️ Mistral est indisponible. Vérifiez qu\'Ollama tourne sur le host Windows.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    setStarted(true);
    send(course.quizPrompt);
  };

  const renderText = (text: string) =>
    text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />');

  if (!started) {
    return (
      <div className="quiz-start-zone">
        <div className="quiz-start-icon">
          <Brain size={40} />
        </div>
        <h3>Testez vos connaissances !</h3>
        <p>Notre IA Mistral va vous poser des questions personnalisées sur <strong>{course.title}</strong> pour vérifier votre compréhension.</p>
        <button className="btn-primary" onClick={startQuiz}>
          <MessageCircle size={16} /> Lancer le Quiz IA
        </button>
      </div>
    );
  }

  return (
    <div className="quiz-chat-zone">
      <div className="quiz-chat-header">
        <Bot size={16} style={{ color: 'var(--accent-cyan)' }} />
        <span>Quiz IA — {course.title}</span>
      </div>
      <div className="quiz-chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message chat-message-${msg.role}`}>
            <div className={`chat-avatar chat-avatar-${msg.role}`}>
              {msg.role === 'bot' ? <Bot size={12} /> : <User size={12} />}
            </div>
            <div className={`chat-bubble chat-bubble-${msg.role}`}>
              <p dangerouslySetInnerHTML={{ __html: renderText(msg.text) }} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-message chat-message-bot">
            <div className="chat-avatar chat-avatar-bot"><Bot size={12} /></div>
            <div className="chat-bubble chat-bubble-bot chat-bubble-loading">
              <Loader size={14} className="spin" /> <span>Mistral réfléchit…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="quiz-chat-input">
        <input
          type="text"
          placeholder="Votre réponse…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(input); } }}
          disabled={loading}
        />
        <button onClick={() => send(input)} disabled={loading || !input.trim()}>
          {loading ? <Loader size={16} className="spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
};

/* ── Main CyberAcademy component ────────────────────────────────────────────── */
export const CyberAcademy: React.FC = () => {
  const [expandedCat, setExpandedCat] = useState<string | null>('Attaques Réseau');
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [activeTab, setActiveTab]     = useState<'cours' | 'quiz'>('cours');

  const course: Course | null = selectedId
    ? (COURSES[selectedId] || { ...DEFAULT_COURSE, id: selectedId, title: selectedId })
    : null;

  return (
    <div className="academy-layout section-card" style={{ padding: 0, overflow: 'hidden' }}>

      {/* ─── Sidebar ─────────────────────────────────────────────────────── */}
      <div className="academy-sidebar">
        <div className="academy-sidebar-header">
          <GraduationCap size={20} style={{ color: 'var(--accent-purple)' }} />
          <h2 style={{ fontSize: 16, margin: 0 }}>Académie Cyber</h2>
        </div>

        <div className="academy-sidebar-content">
          {TOPICS.map(cat => (
            <div key={cat.category} style={{ marginBottom: 8 }}>
              <button
                onClick={() => setExpandedCat(expandedCat === cat.category ? null : cat.category)}
                className="academy-cat-btn"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {cat.icon}
                  {cat.category}
                </div>
                {expandedCat === cat.category ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {expandedCat === cat.category && (
                <div className="academy-items-list">
                  {cat.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setSelectedId(item.id); setActiveTab('cours'); }}
                      className={`academy-item-btn ${selectedId === item.id ? 'active' : ''}`}
                    >
                      <BookOpen size={13} style={{ opacity: 0.6 }} />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Motivation box */}
        <div className="academy-sidebar-footer">
          <Award size={18} style={{ color: 'var(--accent-yellow)' }} />
          <span>Complétez les quiz pour obtenir votre badge de sensibilisation !</span>
        </div>
      </div>

      {/* ─── Main Content ────────────────────────────────────────────────── */}
      <div className="academy-main">
        {!course ? (
          <div className="academy-empty">
            <div className="academy-empty-icon">
              <GraduationCap size={56} />
            </div>
            <h2>Bienvenue à l'Académie Cybernétique</h2>
            <p>Sélectionnez une vulnérabilité dans le menu de gauche pour accéder à son cours détaillé et tester vos connaissances avec notre IA.</p>
            <div className="academy-features-grid">
              <div className="academy-feature">
                <BookOpen size={24} style={{ color: 'var(--accent-cyan)' }} />
                <strong>Cours Pré-rédigés</strong>
                <span>Explications claires, adaptées aux non-informaticiens</span>
              </div>
              <div className="academy-feature">
                <Brain size={24} style={{ color: 'var(--accent-purple)' }} />
                <strong>Quiz IA Interactif</strong>
                <span>Mistral vous pose des questions pour valider vos acquis</span>
              </div>
              <div className="academy-feature">
                <Lock size={24} style={{ color: 'var(--accent-green)' }} />
                <strong>Sensibilisation</strong>
                <span>Formez vos employés aux bonnes pratiques</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="academy-tabs">
              <button
                className={`academy-tab ${activeTab === 'cours' ? 'active' : ''}`}
                onClick={() => setActiveTab('cours')}
              >
                <BookOpen size={15} /> Cours
              </button>
              <button
                className={`academy-tab ${activeTab === 'quiz' ? 'active' : ''}`}
                onClick={() => setActiveTab('quiz')}
              >
                <Brain size={15} /> Quiz IA
              </button>
            </div>

            {activeTab === 'cours' ? (
              <div className="academy-article">
                {/* Course header */}
                <div className="course-header">
                  <div className="course-header-badge">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h1 className="academy-title">{course.title}</h1>
                    <p className="academy-subtitle">Module de sensibilisation · Durée estimée : 5 min</p>
                  </div>
                </div>

                {/* Section 1: C'est quoi ? */}
                <div className="course-section">
                  <div className="course-section-header">
                    <Eye size={18} style={{ color: 'var(--accent-cyan)' }} />
                    <h2>C'est quoi exactement ?</h2>
                  </div>
                  <div className="course-section-body">
                    <p>{course.description}</p>
                  </div>
                </div>

                {/* Section 2: Comment ça marche */}
                <div className="course-section">
                  <div className="course-section-header">
                    <Zap size={18} style={{ color: 'var(--accent-orange)' }} />
                    <h2>Comment ça fonctionne ?</h2>
                  </div>
                  <div className="course-section-body">
                    <p>{course.howItWorks}</p>
                  </div>
                </div>

                {/* Section 3: Pourquoi s'en soucier */}
                <div className="course-section">
                  <div className="course-section-header">
                    <AlertTriangle size={18} style={{ color: 'var(--accent-red)' }} />
                    <h2>Pourquoi est-ce important ?</h2>
                  </div>
                  <div className="course-section-body motivation-box">
                    <p>{course.motivation}</p>
                  </div>
                </div>

                {/* CTA to quiz */}
                <div className="course-cta">
                  <button className="btn-primary" onClick={() => setActiveTab('quiz')}>
                    Tester mes connaissances <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <QuizChat course={course} key={course.id} />
            )}
          </>
        )}
      </div>
    </div>
  );
};
