# 📊 État d'Avancement — Projet SOC Intelligent
> **Dernière mise à jour : 23 Juin 2026 — Version 4**

---

## 🏗️ INFRASTRUCTURE GLOBALE

```
                    INTERNET
                       │
                    [WAN NAT]
                       │
              ┌────────────────┐
              │     R-01       │  192.168.7.138 (WAN)
              │  pfSense 2.6   │  192.168.10.1  (LAN)
              │                │  192.168.20.1  (DMZ)
              │ • DHCP         │  192.168.99.1  (pfsync)
              │ • NAT          │  192.168.30.1  (A3)
              │ • Firewall     │
              │ • OpenVPN      │
              └────────────────┘
                 │      │      │
        ┌────────┘      │      └────────┐
        │               │               │
   VMnet2 (LAN)    VMnet3 (DMZ)    VMnet4 (A3)
   .10.0/24        .20.0/24        .30.0/24
        │               │               │
   SOC-Center      Server-Cible     Ressources
   192.168.10.10   192.168.20.10    192.168.30.11
   PC-A1           Kali-Red         Kali-Blue
   Win10           192.168.20.50    192.168.30.20
                                    PC-A3

        VMnet5 (pfsync 192.168.99.0/30)
              │
             R-02 (à configurer)
```

---

## ✅ VMs COMPLÉTÉES

---

### 🖥️ SOC-Center — Cerveau du SOC
**IP :** `192.168.10.10/24` | **VMnet :** VMnet2 (LAN) | **OS :** Ubuntu Server 22.04

**Rôle :** Serveur central qui collecte, analyse et visualise toutes les données de sécurité du réseau.

| Service | Version | Port | Rôle |
|---|---|---|---|
| InfluxDB | 2.7.0 | 8086 | Stockage métriques temps réel |
| Grafana | Latest | 3000 | Dashboards visualisation |
| Telegraf | 1.38.4 | — | Collecte métriques locales |
| Suricata | 8.0.3 | — | IDS — détection intrusions |
| Wazuh Manager | 4.14.5 | 1514/1515 | SIEM — corrélation événements |
| Fail2Ban | Latest | — | Blocage automatique IPs |
| Node.js + Express | 20.x | 5000 | Backend API REST + WebSocket |
| Neo4j | Latest | 7474/7687 | Graphe topologie réseau |

**Détails techniques :**
- ens33 → VMnet0 NAT → `192.168.7.174` (accès Internet)
- ens37 → VMnet2 LAN → `192.168.10.10/24` (réseau SOC)
- Tous les services démarrent automatiquement au boot
- Telegraf envoie CPU/RAM/Disk/Net toutes les 10 secondes vers InfluxDB

**Buckets InfluxDB :**
| Bucket | Rétention | Contenu |
|---|---|---|
| metrics | 30 jours | CPU, RAM, réseau toutes les VMs |
| logs | 15 jours | Logs système pfSense, OpenVPN |
| suricata_alerts | 60 jours | Alertes IDS avec sévérité |
| incidents | 365 jours | Incidents confirmés + rapports IA |
| wazuh_events | 60 jours | Événements SIEM corrélés |
| gre_tunnels | 30 jours | Métriques tunnels GRE/IPsec |

**Credentials :**
- Neo4j : `neo4j / abd3llah`
- InfluxDB org : `SOC-PFA-YAOE`
- InfluxDB token : `UUWWy5LH1U7dxO628p...` (sauvegardé)

---

### 🔥 R-01 — Firewall & Router Primary
**IP LAN :** `192.168.10.1` | **OS :** pfSense 2.6.0

**Rôle :** Point central du réseau — contrôle tout le trafic, distribue les IPs, gère le VPN et protège les 3 sites.

**Interfaces configurées :**
| Interface | VMnet | IP | Rôle |
|---|---|---|---|
| em0 (WAN) | VMnet0 NAT | 192.168.7.138 (DHCP) | Accès Internet |
| em1 (LAN) | VMnet2 | 192.168.10.1/24 | Site A1 — LAN principal |
| em2 (OPT1) | VMnet3 | 192.168.20.1/24 | Site A2 — DMZ |
| em3 (OPT2) | VMnet5 | 192.168.99.1/30 | pfsync — HA avec R-02 |
| em4 (OPT3) | VMnet4 | 192.168.30.1/24 | Site A3 — Secondaire |

**Services configurés :**
| Service | Config | Status |
|---|---|---|
| DHCP LAN | 192.168.10.100-200 | ✅ |
| DHCP DMZ | 192.168.20.100-200 | ✅ |
| DHCP A3 | 192.168.30.100-200 | ✅ |
| NAT Outbound | Automatique (tous réseaux → WAN) | ✅ |
| Firewall LAN | Allow LAN to any | ✅ |
| Firewall OPT1 | Allow DMZ to any | ✅ |
| Firewall OPT3 | Allow A3 to any | ✅ |
| OpenVPN Server | UDP 1194 — Tunnel 10.0.0.0/24 | ✅ |

**OpenVPN :**
- CA : `SOC-CA` (2048 bit, 10 ans)
- Serveur cert : `SOC-Server-Cert`
- User : `vpn-user` / `abd3llah`
- Crypto : AES-256-GCM + SHA256 + TLS-Auth
- Fichier client : `soc-vpn.ovpn` (exporté et sauvegardé)

**À compléter plus tard :**
- CARP VIPs (nécessite R-02)
- GRE over IPsec tunnels inter-sites
- OSPF FRRouting

---

### 🎯 Server-Cible — Serveur Vulnérable (DMZ)
**IP :** `192.168.20.10/24` | **VMnet :** VMnet3 (DMZ) | **OS :** Ubuntu Server 22.04

**Rôle :** Serveur volontairement vulnérable dans la DMZ. Cible principale des attaques Red Team simulées par Kali-Red.

| Service | Port | Rôle |
|---|---|---|
| Apache2 | 80 | Serveur web cible (page vulnérable) |
| OpenSSH | 22 | Cible brute force SSH |
| Telegraf | — | Envoie métriques → SOC-Center |
| Wazuh Agent | — | Envoie logs → SOC-Center |

**Vulnérabilités intentionnelles :**
- Utilisateur `testuser` avec mot de passe faible `password123`
- SSH : `PermitRootLogin yes` + `MaxAuthTries 10`
- Page web avec formulaire non sécurisé (XSS/SQLi possible)

**Interfaces :**
- ens33 → VMnet0 NAT → `192.168.7.181` (Internet)
- ens37 → VMnet3 DMZ → `192.168.20.10/24`

**Flux de données :**
```
Server-Cible → Telegraf → InfluxDB (SOC-Center) → Grafana
Server-Cible → Wazuh Agent → Wazuh Manager (SOC-Center)
```

---

## 🔄 EN COURS / PARTIELLEMENT FAIT

### 🔥 R-02 — pfSense Secondary (HA)
- [ ] Installation pfSense CE
- [ ] Configuration interfaces (identique R-01)
- [ ] CARP Haute Disponibilité avec R-01
- [ ] pfsync — synchronisation états firewall
- [ ] XMLRPC — synchronisation configuration

---

## ⬜ VMs À CONFIGURER

### 🔴 Kali-Red (192.168.20.50) — Attaquant Red Team
**VMnet :** VMnet3 (DMZ) | **OS :** Kali Linux

**Rôle :** Simuler des attaques réelles contre Server-Cible pour tester la détection SOC.

**À installer :**
- [ ] IP statique `192.168.20.50/24`
- [ ] nmap / masscan (reconnaissance)
- [ ] arpspoof / ettercap (ARP Spoofing)
- [ ] hping3 (flood / DoS)
- [ ] hydra (brute force SSH)
- [ ] metasploit (exploitation)
- [ ] Scripts d'attaques automatisés

---

### 🔵 Kali-Blue (192.168.30.20) — Analyste Blue Team
**VMnet :** VMnet4 (A3) | **OS :** Kali Linux

**Rôle :** Analyser et répondre aux attaques détectées par le SOC.

**À installer :**
- [ ] IP statique `192.168.30.20/24`
- [ ] Zeek (analyse trafic réseau)
- [ ] Wireshark (capture paquets)
- [ ] ntopng (monitoring trafic)
- [ ] CyberChef (analyse forensique)
- [ ] Wazuh Agent → SOC-Center

---

### 🗄️ Ressources (192.168.30.11) — Serveur Site A3
**VMnet :** VMnet4 (A3) | **OS :** Ubuntu Server 22.04

**Rôle :** Serveur de fichiers et ressources secondaires du Site A3.

**À installer :**
- [ ] IP statique `192.168.30.11/24`
- [ ] Samba (serveur fichiers)
- [ ] Telegraf Agent → SOC-Center
- [ ] Wazuh Agent → SOC-Center

---

### 💻 PC-A1 — Poste Client Site A1
**VMnet :** VMnet2 (LAN) | **OS :** Ubuntu Desktop 22.04

**À configurer :**
- [ ] Réseau VMnet2 (DHCP ~192.168.10.101)
- [ ] Accès interface web SOC (navigateur)
- [ ] Tests comportement utilisateur normal

---

### 💻 PC-A3 — Poste Client Site A3
**VMnet :** VMnet4 (A3) | **OS :** Ubuntu Desktop 22.04

**À configurer :**
- [ ] Réseau VMnet4 (DHCP ~192.168.30.100)
- [ ] Test accès inter-sites via VPN
- [ ] Connexion OpenVPN (soc-vpn.ovpn)

---

### 💻 Win10-Client — Poste Windows Site A1
**VMnet :** VMnet2 (LAN) | **OS :** Windows 10 Pro

**À faire :**
- [ ] Installation Windows 10 Pro
- [ ] Configuration réseau VMnet2
- [ ] Accès interface web SOC
- [ ] Génération trafic réaliste

---

## ⬜ DÉVELOPPEMENT — Phase 2

### 🤖 Intelligence Artificielle
- [x] Ollama + Mistral 7B Q4 sur hôte Windows (CUDA GTX 1650)
- [x] Exposer Ollama sur réseau VMware (OLLAMA_HOST=0.0.0.0:11434)
- [x] Pipeline ML Scikit-learn (Généré & Déployé) :
  - [x] Random Forest (classification attaques)
  - [x] Isolation Forest (détection anomalies)
  - [x] Logistic Regression (vrai/faux positif)
  - [x] K-Means (clustering comportements)
- [x] Chatbot expert réseau français
- [x] Intégration chatbot → Frontend React

### 🌐 Frontend React + TypeScript & Backend Node.js
- [x] Backend API Express (Port 5000)
- [x] Interface Employé (Lecture seule, alertes)
- [x] Interface Expert (Analyse ML, Chatbot)
- [x] Interface Admin (Topologie Neo4j interactive, Statut Agents)
- [x] JWT Auth (3 rôles : Admin, Expert, Employee)
- [x] Intégration Recharts & Lucide Icons (Design System Cyberpunk)

### 📱 Bot Discord & Réponse Autonome (Remplacement de Telegram)
- [x] Patch du Bot Discord pour intégrer les prédictions ML
- [x] Rapport automatique post-incident (Random Forest & Isolation Forest)
- [x] Déploiement automatisé du patch (`apply_ml_patch.sh`)
- [ ] Timer 3 minutes (admin doit répondre)
- [ ] Actions autonomes sans approbation :
  - ARP Spoofing → isoler hôte (iptables)
  - Brute Force → Fail2Ban
  - Port Scan → blocage IP
- [ ] Actions avec approbation admin (Boutons Discord)

### 📊 Dashboards Grafana (7 dashboards)
- [ ] Global — santé réseau + uptime
- [ ] Sécurité — alertes Suricata temps réel
- [ ] Réseau — bande passante + latence
- [ ] VMs — CPU/RAM/Disk par machine
- [ ] Incidents — timeline classifiée
- [ ] IA — taux vrais/faux positifs ML
- [ ] VPN — état tunnels OpenVPN + GRE

### 🔒 VPN & Tunnels (Phase 2)
- [ ] GRE over IPsec A1↔A2 (172.16.1.0/30)
- [ ] GRE over IPsec A1↔A3 (172.16.2.0/30)
- [ ] GRE over IPsec A2↔A3 (172.16.3.0/30)
- [ ] OSPF FRRouting (zones par site)

### 📋 Feedback & Amélioration Continue
- [ ] Google Forms (collecte feedback employés)
- [ ] Google Sheets API (export données)
- [ ] Pipeline Python réentraînement ML
- [ ] Jupyter Notebook validation modèles

---

## 📈 Progression Globale

```
Infrastructure réseau  ██████░░░░  55%
Services SOC           ████████░░  85%
Sécurité & IDS         ██████░░░░  60%
IA & ML                ██████████ 100%
Frontend & Backend     ██████████ 100%
VPN & Tunnels          ███░░░░░░░  30%
Notifications (Bot)    ████████░░  80%
Dashboards Grafana     ░░░░░░░░░░   5%
```

### **Progression totale : ~75%** 🚀

---

## 📌 Informations Importantes

### Credentials & Accès
| Service | URL/IP | User | Password |
|---|---|---|---|
| pfSense WebGUI | http://192.168.10.1 | admin | pfsense |
| InfluxDB | http://192.168.10.10:8086 | admin | — (token) |
| Grafana | http://192.168.10.10:3000 | admin | (changé) |
| Neo4j | http://192.168.10.10:7474 | neo4j | abd3llah |
| SOC Backend | http://192.168.10.10:5000 | — | — |
| Server-Cible SSH | 192.168.20.10:22 | testuser | password123 |
| VPN User | soc-vpn.ovpn | vpn-user | abd3llah |

### IPs Hôte Windows (VMware)
| VMnet | IP Hôte Windows | Rôle |
|---|---|---|
| VMnet2 | 192.168.10.254 | Accès LAN depuis hôte |
| VMnet3 | 192.168.20.254 | Accès DMZ depuis hôte |

### Tokens Importants
```
InfluxDB Admin Token:
UUWWy5LH1U7dxO628plHnSke5LomQXCZn6AAwkW0tI_a4t69wxfig7bgPuPnlZpWLNQjDDYAqBiB900pzkstQQ==
```

### Notes Critiques
> **RAM :** Ne jamais lancer tous les groupes simultanément. Max ~7GB VMs actives.

> **Ollama :** À installer sur hôte Windows 11. IP hôte sur VMnet2 = `192.168.10.254`.

> **pfSense webGUI :** Accessible via `http://192.168.10.1` depuis n'importe quelle VM du LAN.

> **Snapshots :** Créer snapshot après chaque VM configurée.

> **GRE over IPsec :** Tester tunnels AVANT d'activer OSPF.

---

## 🗺️ Plan de la Suite

```
Prochaines étapes recommandées :
1. Kali-Red      → installer les outils Red Team + scripts d'attaques
2. Kali-Blue     → installer les outils Blue Team + Wazuh Agent
3. Ressources    → configurer Samba + Telegraf + Wazuh Agent
4. R-02          → installer pfSense Secondary + CARP (Haute Disponibilité)
5. Dashboards    → créer les 7 dashboards Grafana
6. Bot Discord   → implémenter les actions de blocage autonomes (fail2ban/iptables)
7. GRE/IPsec     → configurer les tunnels inter-sites
```

---

*Document généré — Projet SOC Intelligent PFA*
*Architecture : Multi-sites A1/A2/A3 — Ollama CUDA GTX 1650 — pfSense HA CARP*
*Version 3.0 — 17 Mai 2026*
