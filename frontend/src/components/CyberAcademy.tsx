import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ShieldAlert,
  Wifi,
  Smartphone,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  Brain,
  MessageCircle,
  AlertTriangle,
  Lock,
  Eye,
  Zap,
  Award,
  ArrowRight,
  Send,
  Bot,
  User,
  Loader,
  Sparkles,
  Shield,
  Layers3,
  Clock3,
  Check,
} from 'lucide-react';
import { COURSES, DEFAULT_COURSE } from '../data/courses';
import type { Course } from '../data/courses';
import { askChatbot } from '../api/api';

type TopicCategory = {
  category: string;
  accent: 'cyan' | 'red' | 'green';
  icon: React.ReactNode;
  summary: string;
  items: Array<{ id: string; label: string }>;
};

const TOPICS: TopicCategory[] = [
  {
    category: 'Attaques reseau',
    accent: 'cyan',
    icon: <Wifi size={18} />,
    summary: 'Menaces de circulation, d interception et de manipulation du trafic.',
    items: [
      { id: 'ARP Spoofing', label: 'ARP Spoofing' },
      { id: 'MITM', label: 'Man in the Middle' },
      { id: 'Network Sniffing', label: 'Ecoute passive' },
      { id: 'DNS Poisoning', label: 'DNS Poisoning' },
    ],
  },
  {
    category: 'Attaques web',
    accent: 'red',
    icon: <ShieldAlert size={18} />,
    summary: 'Failles applicatives et injection de code dans les interfaces web.',
    items: [
      { id: 'Cross-Site Scripting (XSS)', label: 'XSS' },
      { id: 'SQL Injection (SQLi)', label: 'Injection SQL' },
    ],
  },
  {
    category: 'Securite mobile',
    accent: 'green',
    icon: <Smartphone size={18} />,
    summary: 'Protection des donnees et des comportements applicatifs sur mobile.',
    items: [{ id: 'Insecure Data Storage', label: 'Stockage non securise' }],
  },
];

interface QMsg {
  role: 'user' | 'bot';
  text: string;
}

const COURSE_SECTION_ITEMS = [
  { key: 'description' as const, icon: Eye, title: "C'est quoi exactement ?", step: '01' },
  { key: 'howItWorks' as const, icon: Zap, title: 'Comment ca fonctionne ?', step: '02' },
  { key: 'motivation' as const, icon: AlertTriangle, title: "Pourquoi c'est important ?", step: '03' },
];

function splitReadableParagraphs(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentences.length <= 2) return sentences;

  const chunks: string[] = [];
  let current = '';

  sentences.forEach((sentence, index) => {
    current = current ? `${current} ${sentence}` : sentence;
    const shouldBreak = current.length > 180 || index === sentences.length - 1;
    if (shouldBreak) {
      chunks.push(current.trim());
      current = '';
    }
  });

  return chunks;
}

function buildKeyPoints(course: Course): string[] {
  return [course.description, course.howItWorks, course.motivation]
    .map((text) => splitReadableParagraphs(text)[0])
    .filter(Boolean)
    .slice(0, 3);
}

function renderFormattedText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.includes('\n')
      ? part.split('\n').map((line, j) => (
          <React.Fragment key={`${i}-${j}`}>
            {j > 0 && <br />}
            {line}
          </React.Fragment>
        ))
      : part;
  });
}

const QuizChat: React.FC<{ course: Course }> = ({ course }) => {
  const [messages, setMessages] = useState<QMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: QMsg = { role: 'user', text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await askChatbot(text.trim());
      setMessages((prev) => [...prev, { role: 'bot', text: res.data.response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: "L'assistant IA est indisponible pour le moment. Verifiez qu'Ollama tourne bien sur la machine hote.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    setStarted(true);
    send(course.quizPrompt);
  };

  if (!started) {
    return (
      <div className="quiz-start-zone">
        <div className="quiz-start-icon">
          <Brain size={32} />
        </div>
        <div className="quiz-start-copy">
          <span className="academy-eyebrow">Session interactive</span>
          <h3>Validez la comprehension de ce module avec un quiz guide par IA.</h3>
          <p>
            Mistral vous pose quelques questions sur <strong>{course.title}</strong> afin de verifier les notions
            essentielles avant le passage a l action.
          </p>
        </div>
        <div className="quiz-start-meta">
          <span>3 questions ciblees</span>
          <span>Feedback immediat</span>
          <span>Reponse libre ou guidee</span>
        </div>
        <button className="btn-primary academy-quiz-launch" onClick={startQuiz}>
          <MessageCircle size={16} /> Lancer le quiz IA
        </button>
      </div>
    );
  }

  return (
    <div className="quiz-chat-zone">
      <div className="quiz-chat-header">
        <div className="quiz-chat-title">
          <Bot size={16} />
          <span>Quiz IA</span>
        </div>
        <span className="quiz-chat-subtitle">{course.title}</span>
      </div>
      <div className="quiz-chat-messages">
        {messages.map((msg, i) => (
          <div key={`${msg.role}-${i}`} className={`chat-message chat-message-${msg.role}`}>
            <div className={`chat-avatar chat-avatar-${msg.role}`}>
              {msg.role === 'bot' ? <Bot size={12} /> : <User size={12} />}
            </div>
            <div className={`chat-bubble chat-bubble-${msg.role}`}>
              <p>{renderFormattedText(msg.text)}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-message chat-message-bot">
            <div className="chat-avatar chat-avatar-bot">
              <Bot size={12} />
            </div>
            <div className="chat-bubble chat-bubble-bot chat-bubble-loading">
              <Loader size={14} className="spin" />
              <span>Mistral reflechit...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="quiz-chat-input">
        <input
          type="text"
          placeholder="Saisissez votre reponse..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              send(input);
            }
          }}
          disabled={loading}
        />
        <button onClick={() => send(input)} disabled={loading || !input.trim()}>
          {loading ? <Loader size={16} className="spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
};

export const CyberAcademy: React.FC = () => {
  const [expandedCat, setExpandedCat] = useState<string | null>('Attaques reseau');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cours' | 'quiz'>('cours');
  const mainRef = useRef<HTMLDivElement>(null);

  const topicCount = TOPICS.length;
  const courseCount = TOPICS.reduce((total, topic) => total + topic.items.length, 0);

  const selectedTopic = useMemo(
    () => TOPICS.find((topic) => topic.items.some((item) => item.id === selectedId)) ?? null,
    [selectedId]
  );

  const course: Course | null = selectedId
    ? (COURSES[selectedId] || { ...DEFAULT_COURSE, id: selectedId, title: selectedId })
    : null;
  const keyPoints = course ? buildKeyPoints(course) : [];
  const moduleOutcomes = course
    ? [
        `Identifier les signaux associes a ${course.title}.`,
        'Expliquer le risque avec un vocabulaire simple et rigoureux.',
        "Choisir une premiere action de prevention ou d'escalade.",
      ]
    : [];

  const selectCourse = (id: string) => {
    setSelectedId(id);
    setActiveTab('cours');
    mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="academy-shell">
      <div className="academy-layout">
        <aside className="academy-sidebar">
          <div className="academy-sidebar-header">
            <div className="academy-sidebar-brand">
              <div className="academy-sidebar-brand-icon">
                <GraduationCap size={18} />
              </div>
              <div>
                <span className="academy-eyebrow">Centre de formation</span>
                <h2>Academie Cyber</h2>
              </div>
            </div>
            <p>
              Parcours de sensibilisation concus pour des analystes, des employes et des responsables techniques.
            </p>
          </div>

          <div className="academy-sidebar-stats">
            <div className="academy-stat-card">
              <span className="academy-stat-value">{courseCount}</span>
              <span className="academy-stat-label">Modules</span>
            </div>
            <div className="academy-stat-card">
              <span className="academy-stat-value">{topicCount}</span>
              <span className="academy-stat-label">Domaines</span>
            </div>
            <div className="academy-stat-card">
              <span className="academy-stat-value">IA</span>
              <span className="academy-stat-label">Quiz assistes</span>
            </div>
          </div>

          <div className="academy-sidebar-content">
            {TOPICS.map((topic) => {
              const isExpanded = expandedCat === topic.category;
              return (
                <section key={topic.category} className={`academy-topic-group academy-topic-${topic.accent}`}>
                  <button
                    type="button"
                    onClick={() => setExpandedCat(isExpanded ? null : topic.category)}
                    className="academy-cat-btn"
                  >
                    <div className="academy-cat-main">
                      <span className="academy-cat-icon">{topic.icon}</span>
                      <div className="academy-cat-copy">
                        <span className="academy-cat-title">{topic.category}</span>
                        <span className="academy-cat-summary">{topic.summary}</span>
                      </div>
                    </div>
                    <div className="academy-cat-meta">
                      <span className="academy-cat-count">{topic.items.length}</span>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="academy-items-list">
                      {topic.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => selectCourse(item.id)}
                          className={`academy-item-btn ${selectedId === item.id ? 'active' : ''}`}
                        >
                          <BookOpen size={13} />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <div className="academy-sidebar-footer">
            <Award size={18} />
            <div>
              <strong>Progression continue</strong>
              <span>Passez du cours au quiz sans quitter la meme vue de travail.</span>
            </div>
          </div>
        </aside>

        <div className="academy-main" ref={mainRef}>
          {!course ? (
            <div className="academy-empty">
              <div className="academy-empty-hero">
                <div className="academy-empty-copy">
                  <span className="academy-eyebrow">Programme de sensibilisation</span>
                  <h1>Transformez la veille cyber en parcours d'apprentissage clair et actionnable.</h1>
                  <p>
                    Ouvrez un module depuis la colonne de gauche pour acceder a un resume pedagogique, un angle
                    business et une verification des acquis assistee par IA.
                  </p>
                  <div className="academy-empty-badges">
                    <span>
                      <Layers3 size={14} /> Parcours structures
                    </span>
                    <span>
                      <Clock3 size={14} /> Lecture rapide
                    </span>
                    <span>
                      <Brain size={14} /> Quiz interactif
                    </span>
                  </div>
                </div>
                <div className="academy-empty-panel">
                  <div className="academy-empty-panel-head">
                    <Sparkles size={16} />
                    <span>Ce que vous pouvez faire ici</span>
                  </div>
                  <div className="academy-empty-panel-list">
                    <div className="academy-empty-panel-item">
                      <BookOpen size={18} />
                      <div>
                        <strong>Comprendre une menace</strong>
                        <span>Chaque module explique le concept, le mecanisme et l'impact metier.</span>
                      </div>
                    </div>
                    <div className="academy-empty-panel-item">
                      <Shield size={18} />
                      <div>
                        <strong>Former rapidement</strong>
                        <span>Le contenu est adapte a des profils non techniques et aux equipes support.</span>
                      </div>
                    </div>
                    <div className="academy-empty-panel-item">
                      <Brain size={18} />
                      <div>
                        <strong>Verifier les acquis</strong>
                        <span>Le quiz IA transforme le cours en evaluation immediate et contextualisee.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="academy-features-grid">
                <article className="academy-feature">
                  <BookOpen size={22} />
                  <strong>Cours pre-rediges</strong>
                  <span>Des explications courtes et professionnelles, pretes pour la sensibilisation interne.</span>
                </article>
                <article className="academy-feature">
                  <Lock size={22} />
                  <strong>Angles metier</strong>
                  <span>Chaque fiche relie la menace a un impact concret pour l'entreprise et ses utilisateurs.</span>
                </article>
                <article className="academy-feature">
                  <MessageCircle size={22} />
                  <strong>Evaluation assistee</strong>
                  <span>Le module de quiz apporte une verification plus engageante qu'un simple contenu passif.</span>
                </article>
              </div>
            </div>
          ) : (
            <div className="academy-course-shell">
              <div className="academy-course-hero">
                <div className="academy-course-copy">
                  <div className="academy-course-badge-row">
                    <span className="academy-pill academy-pill-primary">
                      <ShieldAlert size={14} />
                      {selectedTopic?.category || 'Module'}
                    </span>
                    <span className="academy-pill">
                      <Clock3 size={14} /> 5 min de lecture
                    </span>
                  </div>
                  <h1 className="academy-title">{course.title}</h1>
                  <p className="academy-course-intro">
                    Une fiche concise pour comprendre le risque, le mecanisme d'attaque et le message a transmettre
                    aux equipes.
                  </p>
                  <div className="academy-course-actions">
                    <button className="btn-primary" onClick={() => setActiveTab('quiz')}>
                      Tester mes connaissances <ArrowRight size={16} />
                    </button>
                    <button className="academy-secondary-btn" onClick={() => setActiveTab('cours')}>
                      Relire le module
                    </button>
                  </div>
                </div>

                <div className="academy-course-aside">
                  <div className="academy-course-aside-card">
                    <span className="academy-eyebrow">Objectif</span>
                    <p>Donner une lecture simple mais rigoureuse du sujet pour l'analyse, la prevention et la communication interne.</p>
                  </div>
                  <div className="academy-course-aside-card">
                    <span className="academy-eyebrow">Format</span>
                    <p>Cours synthese, points d'attention metier, puis verification via conversation guidee avec l'assistant IA.</p>
                  </div>
                </div>
              </div>

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
                <>
                  <section className="academy-content-section">
                    <div className="academy-section-heading">
                      <div>
                        <span className="academy-eyebrow">Lecture rapide</span>
                        <h2>L'essentiel a retenir</h2>
                      </div>
                      <p>Trois idees a memoriser avant d'entrer dans le detail du module.</p>
                    </div>
                    <div className="academy-reading-strip">
                      {keyPoints.map((point, index) => (
                        <article key={`${course.id}-point-${index}`} className="academy-reading-card">
                          <span className="academy-reading-label">Point cle {index + 1}</span>
                          <p>{point}</p>
                        </article>
                      ))}
                    </div>
                  </section>

                  <div className="academy-course-body">
                    <section className="academy-content-section academy-content-section-main">
                      <div className="academy-section-heading">
                        <div>
                          <span className="academy-eyebrow">Contenu du module</span>
                          <h2>Lecture du module</h2>
                        </div>
                        <p>Le contenu est organise pour passer du concept a l'impact metier, puis a l'action.</p>
                      </div>

                      <div className="academy-article">
                        {COURSE_SECTION_ITEMS.map((section) => {
                          const Icon = section.icon;
                          return (
                            <article key={section.key} className="course-section">
                              <div className="course-section-header">
                                <div className="course-section-badge">{section.step}</div>
                                <div className="course-section-title-group">
                                  <div className="course-section-icon">
                                    <Icon size={18} />
                                  </div>
                                  <h2>{section.title}</h2>
                                </div>
                              </div>
                              <div className="course-section-body">
                                {splitReadableParagraphs(course[section.key]).map((paragraph, paragraphIndex) => (
                                  <p
                                    key={`${section.key}-paragraph-${paragraphIndex}`}
                                    className={paragraphIndex === 0 ? 'course-paragraph course-paragraph-lead' : 'course-paragraph'}
                                  >
                                    {paragraph}
                                  </p>
                                ))}
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      <div className="course-cta">
                        <div className="course-cta-copy">
                          <span className="academy-eyebrow">Passage a l'action</span>
                          <h3>Validez ce module pendant que le contexte est encore frais.</h3>
                          <p>
                            Le quiz IA reprend les points cles du cours et aide a verifier la comprehension sans
                            quitter l'ecran.
                          </p>
                        </div>
                        <button className="btn-primary" onClick={() => setActiveTab('quiz')}>
                          Ouvrir le quiz IA <ArrowRight size={16} />
                        </button>
                      </div>
                    </section>

                    <aside className="academy-course-rail">
                      <section className="academy-rail-panel">
                        <div className="academy-rail-head">
                          <span className="academy-eyebrow">Fiche rapide</span>
                          <h3>Vue d'ensemble</h3>
                        </div>
                        <div className="academy-overview-grid">
                          <div className="academy-overview-card">
                            <span className="academy-overview-label">Public vise</span>
                            <strong>Analystes, support, collaborateurs</strong>
                          </div>
                          <div className="academy-overview-card">
                            <span className="academy-overview-label">Niveau</span>
                            <strong>Sensibilisation rapide</strong>
                          </div>
                          <div className="academy-overview-card">
                            <span className="academy-overview-label">Livrable</span>
                            <strong>Comprendre puis expliquer</strong>
                          </div>
                        </div>
                      </section>

                      <section className="academy-rail-panel">
                        <div className="academy-rail-head">
                          <span className="academy-eyebrow">Resultat attendu</span>
                          <h3>Ce module permet de</h3>
                        </div>
                        <div className="academy-checklist">
                          {moduleOutcomes.map((item, index) => (
                            <div key={`${course.id}-outcome-${index}`} className="academy-check-item">
                              <span className="academy-check-bullet">
                                <Check size={14} />
                              </span>
                              <p>{item}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    </aside>
                  </div>
                </>
              ) : (
                <QuizChat course={course} key={course.id} />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
