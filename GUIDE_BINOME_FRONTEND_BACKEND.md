# 🚀 Guide de Transition pour le Binôme (Frontend & Backend)

Salut ! Si tu lis ce document, c'est que tu vas prendre le relais sur la partie **Interface (Frontend)** et **Serveur (Backend)** pendant que nous avançons sur l'intégration des Machines Virtuelles (VMs), de Wazuh et du réseau.

Voici un récapitulatif de ce qui a été commencé, de ce qu'il reste à corriger immédiatement, et des objectifs pour que la plateforme soit visuellement impressionnante et techniquement fonctionnelle.

---

## 🎨 1. Tâches UI/UX & Frontend Immédiates

Nous avons récemment fait la bascule d'un thème "Dark Cyberpunk" vers un **thème Clair / Blanc Professionnel** (`index.css`), mais il reste des finitions importantes pour que le rendu soit parfait :

- [ ] **Ajustement du Thème Clair** : Certains textes ou composants (comme la Sidebar) peuvent encore avoir des restes du mode sombre. Il faut uniformiser le design pour que l'interface globale soit ultra-premium, claire et lisible.
- [ ] **Changer les Icônes** : L'interface utilise actuellement `lucide-react`. N'hésite pas à ajuster la taille, le poids (strokeWidth) ou même à changer de bibliothèque si tu trouves des icônes plus professionnelles et corporatives.
- [ ] **Corriger la Confiance de l'IA (Hardcodée)** : 
  - Fichier : `frontend/src/pages/AIThreatAnalysis.tsx`
  - Tâche : Cherche la constante `CONFIDENCE = 82` et change-la (par exemple `91`), ou encore mieux, rends-la dynamique en fonction du scan réel.
- [ ] **Retirer le Warning Jaune (DAST)** :
  - Fichier : `frontend/src/pages/DynamicAnalysisDashboard.tsx`
  - Tâche : Supprimer la bannière d'avertissement jaune (`<div className="dyn-notice">...</div>`) qui indique que les résultats sont simulés, pour donner un aspect finalisé à la démonstration.
- [ ] **"Impressively Good"** : L'objectif est d'impressionner le jury. Ajoute des micro-animations, améliore les ombres (`box-shadow`), et assure-toi que les tableaux de bord respirent la modernité.

---

## ⚙️ 2. Tâches Backend & Intégration de Données (APIs)

Le backend (Node.js) tourne sur le port `5000` et sert l'API pour le frontend, mais beaucoup de routes renvoient encore des données "mockées" (simulées) si les bases de données ne sont pas connectées. 

- [ ] **Remplacer les Mocks par les Vraies Alertes (InfluxDB / Suricata)** :
  - Assure-toi que la route `/alerts` (`backend/server.js`) récupère bien les alertes générées par Suricata dans InfluxDB au lieu de renvoyer la variable `MOCK_ALERTS`.
- [ ] **Cartographie Réseau (Neo4j)** :
  - La route `/topology` renvoie des nœuds simulés. Il faut s'assurer que la requête Cypher (`MATCH (n)-[r]->(m) RETURN n, r, m`) fonctionne avec la base Neo4j locale pour dessiner la vraie topologie dynamique dans le frontend.
- [ ] **Analyse Dynamique Mobile (DAST)** :
  - Le dashboard dynamique est magnifique, mais il faut que le backend intercepte réellement le trafic d'un émulateur Android (via un proxy ou un script Python) pour alimenter les graphiques de requêtes HTTP et de trafic réseau.
- [ ] **Remédiation Active** :
  - La page "Réponse aux Incidents" possède des boutons pour bloquer des IPs. Implémenter la logique backend (`execSync`) pour que ces boutons déclenchent de véritables règles `iptables` ou bloquent les IPs via l'API pfSense.

---

## 📦 Organisation du Code

- **Frontend** : React + Vite + TypeScript. Les pages principales sont dans `frontend/src/pages/`.
- **Backend** : Express.js (`backend/server.js`). Le moteur d'analyse statique des APKs se trouve dans `backend/scanner.js`.
- **Machine Learning** : Python (`ml/`). Les modèles sont déjà entraînés et générés. Le backend les appelle via `ml/ml_predict.py`.

Bon courage ! Pendant ce temps, nous allons configurer l'infrastructure PfSense, Ubuntu, Kali, et l'intégration de l'agent Wazuh. 🚀
