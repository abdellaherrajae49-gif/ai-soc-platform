# 🛡️ PLATEFORME SOC INTELLIGENTE — RAPPORT COMPLET
> **Réseau Hybride Multi-Sites · Supervision · Détection · IA Locale · Réponse Autonome**
> **Dernière mise à jour : 19 Juin 2026 — Version 7.0**

---

# 1️⃣ LE PROJET

## 1.1 Description Générale

Ce projet consiste à concevoir et déployer une **plateforme SOC (Security Operations Center) complète**, open-source, autonome et intelligente, sur une seule machine hôte (VMware). Elle couvre :

- La conception d'un réseau multi-sites sécurisé (3 sites)
- La supervision réseau en temps réel
- La détection d'intrusions (IDS/SIEM)
- L'analyse par IA locale (LLM + Machine Learning)
- Une interface web multi-rôles (Employé / Expert / Admin)
- Un système de réponse autonome aux incidents via Telegram

## 1.2 Paramètres Généraux

| Paramètre | Valeur |
|---|---|
| **Machine hôte** | Windows 11 — i7 11ème gen — GTX 1650 Max-Q — 16GB RAM — 1TB SSD |
| **Hyperviseur** | VMware Workstation Pro |
| **IA locale (hôte)** | Ollama + Mistral 7B Q4 quantized (CUDA — GTX 1650) |
| **Langue du chatbot/IA** | Français |
| **Architecture** | Multi-sites (A1 / A2 / A3) — GRE over IPsec + OpenVPN (Phase 2) |
| **Notifications** | Telegram Bot interactif (bloqué — voir 3.10) |

## 1.3 Architecture Globale du Réseau

```
                         INTERNET (NAT/WAN)
                                │
                     ┌──────────┴──────────┐
                     │        R-01          │  192.168.7.138 (WAN)
                     │   pfSense 2.6.0      │  192.168.10.1  (LAN)
                     │  Primary Firewall    │  192.168.20.1  (DMZ)
                     │  + OpenVPN Server    │  192.168.30.1  (A3)
                     │  + Suricata IDS      │  192.168.99.1  (pfsync)
                     └──────────┬──────────┘
                                │
           ┌────────────────────┼────────────────────┐
           │                    │                    │
      VMnet2 (LAN)         VMnet3 (DMZ)         VMnet4 (A3)
    192.168.10.0/24       192.168.20.0/24       192.168.30.0/24
           │                    │                    │
    SOC-Center             Server-Cible          Kali-Blue
    192.168.10.10          192.168.20.10         192.168.30.20
    PC-A1 (DHCP, ⬜)       Kali-Red              PC-A3 (DHCP, ⬜)
    Win10 (⬜)             192.168.20.50          Ressources (⬜)
                                                  192.168.30.11

     VMnet5 (pfsync 192.168.99.0/30)
           │
          R-02 (⬜ à configurer — CARP HA)

  Hôte Windows 11 (machine physique) :
     VMnet2 adapter : 192.168.10.254
     VMnet3 adapter : 192.168.20.254
     VMnet4 adapter : 192.168.30.254 (à vérifier)
     Ollama + Mistral 7B Q4 : 0.0.0.0:11434 ✅ exposé sur le réseau VMware (testé depuis SOC-Center)
     Telegram Bot : @<ton_bot> — token + chat_id configurés, mais activation bloquée (voir 3.10)
```

---

# 2️⃣ ADRESSAGE & ACCÈS

## 2.1 Plan d'Adressage IP

| Site | Réseau | Passerelle | VMnet |
|---|---|---|---|
| **Site A1 — LAN** | 192.168.10.0/24 | 192.168.10.1 | VMnet2 |
| **Site A2 — DMZ** | 192.168.20.0/24 | 192.168.20.1 | VMnet3 |
| **Site A3 — Secondary** | 192.168.30.0/24 | 192.168.30.1 | VMnet4 |
| **OpenVPN** | 10.0.0.0/24 | 10.0.0.1 | — |
| **pfsync HA** | 192.168.99.0/30 | — | VMnet5 |
| **WAN NAT** | 192.168.7.x (DHCP VMware) | — | VMnet0 |

## 2.2 Inventaire VMs & IPs

| VM | IP interne | IP NAT | OS | RAM | VMnet | Statut |
|---|---|---|---|---|---|---|
| **R-01** (pfSense Primary) | 192.168.10.1 / .20.1 / .30.1 / .99.1 | 192.168.7.138 | pfSense 2.6.0 | 1 GB | VMnet0/2/3/4/5 | ✅ |
| **R-02** (pfSense Secondary) | 192.168.10.2 (prévu) | — | pfSense CE | 1 GB | VMnet0/2/3/4/5 | ⬜ |
| **SOC-Center** | 192.168.10.10 | 192.168.7.174 | Ubuntu Server 22.04 | 2 GB | VMnet2 | ✅ |
| **Server-Cible** | 192.168.20.10 | 192.168.7.181 | Ubuntu Server 22.04 | 1 GB | VMnet3 | ✅ |
| **Kali-Red** | 192.168.20.50 | 192.168.7.182 | Kali Linux | 1.5 GB | VMnet3 | ✅ |
| **Kali-Blue** | 192.168.30.20 | 192.168.7.148 | Kali Linux | 1.5 GB | VMnet4 | ✅ |
| **PC-A1** | DHCP ~.101 | — | Ubuntu Desktop | 1.5 GB | VMnet2 | ⬜ |
| **PC-A3** | DHCP ~.100 | — | Ubuntu Desktop | 1.5 GB | VMnet4 | ⬜ |
| **Win10-Client** | DHCP ~.100 | — | Windows 10 Pro | 1.5 GB | VMnet2 | ⬜ |
| **Ressources A3** | 192.168.30.11 (prévu) | — | Ubuntu Server 22.04 | 1 GB | VMnet4 | ⬜ |

## 2.3 IPs Hôte Windows (adaptateurs VMware)

| VMnet | IP Hôte | Rôle |
|---|---|---|
| VMnet2 | 192.168.10.254 | Accès LAN depuis hôte + Ollama |
| VMnet3 | 192.168.20.254 | Accès DMZ depuis hôte |
| VMnet4 | 192.168.30.254 (à confirmer) | Accès A3 depuis hôte |
| NAT | 192.168.7.x | Accès Internet pour toutes les VMs |

## 2.4 Credentials & Accès Complets

| Service | URL / IP | User | Password / Token |
|---|---|---|---|
| pfSense WebGUI | http://192.168.10.1 | admin | pfsense |
| InfluxDB | http://192.168.10.10:8086 | admin | voir token ci-dessous |
| Grafana | http://192.168.7.174:3000 | admin | (changé en interne) |
| Neo4j | http://192.168.10.10:7474 | neo4j | abd3llah |
| ntopng (Kali-Blue) | http://192.168.7.148:3001 | admin | abd3llah |
| SSH SOC-Center | 192.168.7.174:22 | abdellah | — |
| SSH Kali-Blue | 192.168.7.148:22 | root | — |
| SSH Kali-Red | 192.168.7.182:22 | root | — |
| SSH Server-Cible | 192.168.7.181:22 / 192.168.20.10:22 | abdellah | — |
| SSH R-01 pfSense | 192.168.10.1 | admin | pfsense |
| VPN (OpenVPN) | soc-vpn.ovpn | vpn-user | abd3llah |
| Server-Cible (cible brute-force) | 192.168.20.10:22 | testuser | password123 |
| Ollama (local hôte, exposé réseau) | http://0.0.0.0:11434 (host) / accessible depuis 192.168.10.x | — | — |
| Telegram Bot | @<username choisi> | — | Token: `8974485203:AAEOEPO3REii-6CzNXqVp-jSX4lDXrb0zmI` |
| Telegram Chat ID | — | Yassine | `6743672822` |

### Token InfluxDB Admin
```
UUWWy5LH1U7dxO628plHnSke5LomQXCZn6AAwkW0tI_a4t69wxfig7bgPuPnlZpWLNQjDDYAqBiB900pzkstQQ==
Org : SOC-PFA-YAOE
```

⚠️ **Sécurité :** Ce document contient des secrets en clair (tokens, mots de passe). À ne pas publier ni committer sur un repo public — à réserver à un usage interne pendant le développement.

---

# 3️⃣ CE QUI EST DÉJÀ FAIT

## 3.1 R-01 — pfSense Primary ✅

```
OS    : pfSense 2.6.0
RAM   : 1 GB
Interfaces :
  em0 → VMnet0  (WAN  — 192.168.7.138 DHCP)
  em1 → VMnet2  (LAN  — 192.168.10.1/24)
  em2 → VMnet3  (DMZ  — 192.168.20.1/24)
  em3 → VMnet5  (SYNC — 192.168.99.1/30)
  em4 → VMnet4  (A3   — 192.168.30.1/24)
```

| Service | Configuration | Statut |
|---|---|---|
| DHCP LAN | 192.168.10.100-200 | ✅ |
| DHCP DMZ | 192.168.20.100-200 | ✅ |
| DHCP A3 | 192.168.30.100-200 | ✅ |
| NAT Outbound | Automatique (tous réseaux → WAN) | ✅ |
| Firewall LAN/DMZ/A3 | Allow to any | ✅ |
| OpenVPN Server | UDP 1194 — 10.0.0.0/24 — AES-256-GCM | ✅ |
| Suricata IDS | WAN + OPT1(DMZ) + LAN — règles ET Open | ✅ |
| CARP HA | Nécessite R-02 | ⬜ |
| GRE over IPsec | Phase 2 | ⬜ |
| OSPF FRRouting | Phase 2 | ⬜ |

**OpenVPN :**
```
Mode       : Server (tun)
Protocole  : UDP 1194
Subnet     : 10.0.0.0/24
Auth       : PKI (Easy-RSA) — CA: SOC-CA (2048 bit, 10 ans)
Cert serveur: SOC-Server-Cert (398 jours)
Chiffrement: AES-256-GCM + SHA256 + TLS-Auth, DH 2048
User       : vpn-user / abd3llah
Fichier    : soc-vpn.ovpn (exporté et sauvegardé) ✅
```

## 3.2 SOC-Center (192.168.10.10) ✅

```
OS    : Ubuntu Server 22.04 LTS
IPs   : 192.168.10.10/24 (ens37) + 192.168.7.174 (ens33 NAT)
RAM   : 2 GB | Disk : 40 GB (étendu depuis 20 GB initial)
```

| Service | Version | Port | Statut |
|---|---|---|---|
| InfluxDB | 2.7.0 | 8086 | ✅ |
| Grafana | Latest | 3000 | ✅ |
| Telegraf | 1.38.4 | — | ✅ |
| Suricata | 8.0.3 | — | ✅ (ens37 + ens33) |
| Wazuh Manager | 4.14.5 | 1514/1515 | ✅ |
| Fail2Ban | Latest | — | ✅ |
| Node.js + Express | 20.20.2 | 5000 | ✅ |
| Neo4j Community | Latest | 7474/7687 | ✅ |
| rsyslog (serveur) | — | 514/UDP | ✅ |
| suricata-to-influx.py | — | — | ⚠️ Script Python lancé manuellement (`python3 /opt/suricata-to-influx.py &`) — **pas** un service systemd, ne survit pas à un redémarrage |
| analyze.py (Mistral) | — | — | ✅ optimisé — analyse groupée par patterns/corrélations plutôt qu'alerte par alerte (voir 3.8) |

**Buckets InfluxDB :**
| Bucket | Rétention | Contenu | Statut |
|---|---|---|---|
| `metrics` | 30 jours | CPU/RAM/Disk/Net (Telegraf, 10s) | ✅ Actif |
| `suricata_alerts` | 60 jours | Alertes IDS avec sévérité | ✅ Actif |
| `logs` | 15 jours | Logs système | ✅ Actif |
| `incidents` | 365 jours | Incidents confirmés | ✅ Actif |
| `wazuh_events` | 60 jours | Événements SIEM | ✅ Actif |
| `gre_tunnels` | 30 jours | Métriques tunnels | ✅ (vide — phase 2) |

**Wazuh Agents connectés :**
| Agent | ID | Statut |
|---|---|---|
| SOC-Center (serveur local) | 000 | ✅ Active |
| Kali-Red | 003 | ✅ Active |
| Kali-Blue | 004 | ✅ Active |
| Server-Cible | — | ✅ Active |

> ⚠️ **Action à prévoir :** convertir `suricata-to-influx.py` en service systemd (unit file + `enable`) pour qu'il redémarre automatiquement avec la VM. Actuellement, un reboot de SOC-Center coupe silencieusement la chaîne de détection.

## 3.3 Server-Cible (192.168.20.10) ✅

```
OS  : Ubuntu Server 22.04 LTS
IPs : 192.168.20.10/24 (ens37) + 192.168.7.181 (ens33 NAT)
```

| Service | Port | Statut |
|---|---|---|
| Apache2 | 80 | ✅ (page vulnérable XSS/SQLi) |
| OpenSSH | 22 | ✅ (cible brute force) |
| Telegraf | — | ✅ → InfluxDB SOC-Center |
| Wazuh Agent | — | ✅ → Wazuh Manager SOC-Center |
| Suricata 8.0.3 | — | ✅ (ens37 — détection intra-DMZ) |
| rsyslog (client) | — | ✅ → SOC-Center :514 — **corrigé** (voir note ci-dessous) |

**Vulnérabilités intentionnelles :**
- Utilisateur `testuser` / `password123`
- SSH : `PermitRootLogin yes` + `MaxAuthTries 10`
- Page web avec formulaire non sécurisé

> 🐛 **Bug corrigé — destination rsyslog :** Server-Cible envoyait ses logs vers `192.168.7.174` (IP NAT de SOC-Center) au lieu de `192.168.7.181`. Le rapport V6 présentait encore cette adresse comme correcte alors qu'il s'agissait en réalité d'une erreur de configuration. La destination a été corrigée pour pointer vers la bonne IP NAT de Server-Cible côté rsyslog, ce qui a rétabli l'arrivée des logs Suricata vers SOC-Center.

## 3.4 Kali-Red — Red Team (192.168.20.50) ✅

```
OS  : Kali Linux Rolling
IPs : 192.168.20.50/24 (eth1 — DMZ) + 192.168.7.182 (eth0 — NAT)
```

**Outils installés :**
| Outil | Rôle |
|---|---|
| nmap / masscan | Reconnaissance ports/services/OS |
| arpspoof (dsniff) / ettercap | ARP Spoofing — MITM |
| hping3 | DoS SYN Flood |
| hydra | Brute Force SSH/HTTP/FTP |
| metasploit | Exploitation CVE |
| macchanger | MAC Spoofing |
| yersinia | DHCP Starvation / STP |
| wireshark/tcpdump | Capture trafic |

**Scripts d'attaques (`/opt/red-team/`) :**
```
arp_spoof.sh   — ARP Spoofing
port_scan.sh   — nmap -sS -sV -O 192.168.20.0/24  ← TESTÉ ✅
brute_ssh.sh   — hydra -l testuser -P rockyou.txt ssh://192.168.20.10
dos_flood.sh   — hping3 -S --flood -p 80 192.168.20.10
```

## 3.5 Kali-Blue — Blue Team (192.168.30.20) ✅

```
OS  : Kali Linux Rolling
IPs : 192.168.30.20/24 (eth2 — A3) + 192.168.7.148 (eth0 — NAT)
```

| Outil | Rôle | Statut |
|---|---|---|
| Zeek 8.0.5 | Analyse trafic passive (conn/dns/http/notice) | ✅ Actif sur eth2 |
| Wireshark | Capture graphique | ✅ |
| tcpdump | Capture CLI | ✅ |
| ntopng | Monitoring web (:3001, via Docker) | ✅ |
| Wazuh Agent | SIEM → SOC-Center | ✅ |

## 3.6 Chaîne de Détection — Pipeline Complet ✅ OPÉRATIONNEL ET RE-VALIDÉ

```
Kali-Red (192.168.20.50)
    │  nmap scan / attaque
    ▼
Suricata (Server-Cible, ens37)
    │  ET SCAN Possible Nmap User-Agent Observed — Priority 1
    ▼
rsyslog → SOC-Center (192.168.7.181 — IP NAT correcte de Server-Cible)
    ▼
suricata-to-influx.py (script manuel, parse + push)
    ▼
InfluxDB bucket "suricata_alerts"
    ▼
Grafana Dashboard SOC — Sécurité ✅
```

**Test validé end-to-end (re-confirmé après correction rsyslog) :**
- Attaque : `bash /opt/red-team/port_scan.sh` (Kali-Red)
- Une fois Server-Cible redémarré et la route rsyslog corrigée (192.168.7.174 → .181), le scan nmap a bien généré l'alerte `[1:2024364:5] ET SCAN Possible Nmap User-Agent Observed` (Priority 1)
- Donnée confirmée dans InfluxDB (curl) ✅ et visible dans Grafana ✅
- Cela confirme que le bug de routage rsyslog était bien la cause d'une éventuelle absence de logs côté SOC-Center, et que la chaîne complète fonctionne désormais de bout en bout avec la bonne adresse

## 3.7 Dashboards Grafana

**Accès :** http://192.168.7.174:3000 | admin

| Dashboard | Contenu | Statut |
|---|---|---|
| SOC — Sécurité | Alertes Suricata 24h + Attaques Kali-Red | ✅ |
| SOC — VMs | CPU % / RAM % / Disk % / Réseau KB/s | ✅ |
| SOC — Global | Uptime + Total Alertes + ET SCAN count | ✅ |
| SOC — Réseau | Trafic LAN KB/s (ens37) | ✅ |
| SOC — Incidents | Timeline incidents Kali-Red | ✅ |
| SOC — VPN | tun0 (en attente de trafic VPN réel) | 🔄 |
| SOC — IA | Vrais/faux positifs ML | ⬜ (après pipeline ML) |

## 3.8 Intelligence Artificielle — Ollama + Mistral ✅

| Composant | Détail | Statut |
|---|---|---|
| GPU | NVIDIA GTX 1650 Max-Q, driver 596.49 | ✅ |
| CUDA | 13.2, 4096 MB VRAM | ✅ |
| Ollama | Installé sur hôte Windows 11 | ✅ |
| GPU forcé sur Ollama | NVIDIA Control Panel → High-performance | ✅ |
| Modèle | mistral:7b-instruct-q4_0 (4.1 GB) | ✅ téléchargé |
| Script analyse | `/opt/soc-ai/analyze.py` sur SOC-Center | ✅ optimisé (voir ci-dessous) |
| Exposition réseau (OLLAMA_HOST=0.0.0.0) | `OLLAMA_HOST=0.0.0.0:11434` | ✅ **fait et validé** — confirmé en écoute sur toutes les interfaces via `netstat` (LISTENING sur 0.0.0.0:11434), et un `curl` depuis SOC-Center vers l'hôte a répondu correctement |

**Évolution du script d'analyse (analyze.py) :**
Le script ne fait plus une analyse alerte par alerte. Il a été optimisé pour effectuer une **analyse groupée**, en cherchant des patterns et des corrélations entre plusieurs alertes avant de les soumettre à Mistral — ce qui donne un résultat plus pertinent qu'une simple liste d'analyses individuelles (moins de bruit, meilleure détection de campagnes d'attaque cohérentes).

**Test réel effectué (rappel, sur l'ancienne version du script) :**
```
8 alertes priorité 1-2 analysées par Mistral
→ Identification correcte de Kali-Red comme source
→ Score de risque : 9/10
→ Recommandation : bloquer 192.168.20.50
```
Ce test initial a validé le pipeline IA de base (Ollama local + script Python + InfluxDB) ; la version actuelle du script va plus loin avec une analyse par corrélation.

## 3.9 Telegram Bot — Mise en place 🔄 (bloquée — nouvelle cause)

| Étape | Statut |
|---|---|
| Bot créé via @BotFather | ✅ |
| Token récupéré | ✅ `8974485203:AAEOEPO...` |
| Chat ID récupéré (getUpdates) | ✅ `6743672822` |
| Test envoi de message (PowerShell → API Telegram) | ✅ message reçu sur Telegram |
| Activation complète du compte/bot interactif | ❌ **Bloqué — numéro marocain ne reçoit pas le SMS de vérification Telegram** (voir 3.10) |
| Script Python bot interactif sur SOC-Center | ⬜ en attente du déblocage SMS |
| Boutons interactifs (Bloquer/Ignorer) | ⬜ |
| Timer 3 minutes + réponse autonome | ⬜ |

## 3.10 ⚠️ Point Bloquant — Mise à Jour

**Ancien blocage (V6, résolu) :** une perte d'accès Internet sur `ens33` (NAT) de SOC-Center empêchait l'installation des dépendances Python (`Cannot initiate the connection to archive.ubuntu.com:80 — Network is unreachable`).
👉 **Ce problème n'a pas été "réparé" au sens réseau** — il a été **contourné** en passant par une autre voie (Discord / numéros temporaires) pour la partie notifications, plutôt que de diagnostiquer/corriger la connectivité NAT de SOC-Center en profondeur.

**Nouveau blocage (actuel) :** la finalisation du bot Telegram est bloquée pour une raison **différente et sans lien avec le réseau SOC-Center** : le numéro de téléphone marocain utilisé pour l'authentification Telegram **ne reçoit pas le SMS de vérification**. Ce n'est donc plus un problème d'infrastructure (VM, NAT, archive.ubuntu.com) mais un problème côté opérateur/Telegram lié au numéro.

👉 **Action à faire en priorité à la reprise :** trouver une alternative de réception SMS/vérification pour Telegram (autre numéro, méthode de vérification alternative, ou bascule complète vers Discord comme canal de notification principal si le blocage persiste).

---

# 4️⃣ CE QU'IL RESTE À FAIRE

## 4.1 Priorité Immédiate

| # | Tâche | Détail |
|---|---|---|
| 1 | 📱 Débloquer la vérification Telegram | Le numéro marocain ne reçoit pas le SMS — trouver un numéro/méthode alternative ou confirmer le repli sur Discord |
| 2 | ⚙️ Convertir suricata-to-influx.py en service systemd | Actuellement lancé manuellement — ne survit pas à un reboot de SOC-Center |
| 3 | 🤖 Finaliser le Bot Telegram interactif (ou Discord) | python-telegram-bot (ou équivalent Discord) + boutons inline + intégration analyze.py |
| 4 | ⏱️ Logique de réponse autonome | Timer 3 min, actions iptables/Fail2Ban automatiques |

## 4.2 VMs Restantes

| VM | Tâches |
|---|---|
| **R-02** (pfSense Secondary) | Installation + interfaces identiques R-01 + CARP VIPs + pfsync + XMLRPC |
| **Ressources A3** (192.168.30.11) | IP statique, Samba, Telegraf, Wazuh Agent |
| **PC-A1** | Réseau VMnet2, accès interface web SOC |
| **PC-A3** | Réseau VMnet4, connexion OpenVPN (soc-vpn.ovpn) |
| **Win10-Client** | Installation Windows 10 Pro, réseau VMnet2, accès interface SOC |

## 4.3 Intelligence Artificielle & ML

- [ ] Pipeline Scikit-learn : Random Forest (classification attaques)
- [ ] Isolation Forest (détection anomalies)
- [ ] Logistic Regression (vrai/faux positif)
- [ ] K-Means (clustering comportements)
- [ ] Entraînement sur données synthétiques + alertes réelles collectées
- [ ] Intégration résultat ML dans le pipeline d'alerte (avant/avec Mistral)

## 4.4 Frontend & Backend

- [ ] Structure projet React + TypeScript (prompt déjà préparé pour Replit)
- [ ] Login multi-rôle (Employé / Expert / Admin) + JWT
- [ ] Dashboard Employé (encyclopédie attaques + feedback)
- [ ] Dashboard Expert (logs, alertes, métriques temps réel)
- [ ] Dashboard Admin (topologie Neo4j interactive, gestion incidents)
- [ ] WebSocket temps réel (socket.io) connecté au backend Node.js existant
- [ ] Chatbot flottant connecté à Ollama/Mistral via le backend

## 4.5 VPN & Tunnels (Phase 2)

- [ ] GRE over IPsec A1↔A2 (172.16.1.0/30)
- [ ] GRE over IPsec A1↔A3 (172.16.2.0/30)
- [ ] GRE over IPsec A2↔A3 (172.16.3.0/30)
- [ ] OSPF FRRouting (zones par site) — **à tester seulement après que les tunnels GRE soient stables**

## 4.6 R-02 & Haute Disponibilité

- [ ] Installation pfSense CE
- [ ] CARP VIPs : 192.168.10.254 / .20.254 / .30.254
- [ ] pfsync (VMnet5) + XMLRPC
- [ ] Test de failover (couper R-01 → vérifier reprise < 1 sec)

## 4.7 Feedback & Amélioration Continue

- [ ] Google Forms (collecte feedback employés)
- [ ] Export Google Sheets → pipeline Python
- [ ] Jupyter Notebook : réentraînement périodique des modèles ML

## 4.8 Documentation Finale

- [ ] Rapport technique complet
- [ ] Slides de présentation + démo live (attaque → détection → réponse autonome → rapport Telegram/Discord)
- [ ] Schéma d'architecture final (Draw.io)
- [ ] Manuel utilisateur par rôle

---

# 📈 Progression Globale (estimée)

```
Infrastructure réseau    ██████░░░░  60%
Services SOC             █████████░  90%
Sécurité & IDS           ████████░░  80%
Dashboards Grafana       ██████░░░░  60%
IA & ML                  ███░░░░░░░  35%   (Ollama exposé réseau + analyse groupée par corrélation ; ML pipeline à faire)
Frontend & Backend       ██░░░░░░░░  20%
VPN & Tunnels            ███░░░░░░░  30%
Notifications Telegram   ███░░░░░░░  30%   (bot + token + test message OK, bloqué par vérification SMS du numéro marocain)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROGRESSION TOTALE : ~58-60% 🚀
```

---

# 📌 Notes Critiques

> **RAM :** Ne jamais lancer tous les groupes de VMs simultanément. Max ~7GB VMs actives en simultané, Ollama Q4 occupe ~4GB sur l'hôte.

> **Internet SOC-Center :** Le blocage réseau initial sur `ens33` n'a pas été formellement diagnostiqué/réparé — il a été contourné via Discord/numéros temporaires pour la partie notifications. Un diagnostic propre (`ip a`, `ip route`, `ping 8.8.8.8`) reste recommandé si d'autres installations de paquets sont nécessaires à l'avenir.

> **Telegram — nouveau blocage :** L'activation du bot Telegram est actuellement bloquée par l'échec de réception du SMS de vérification sur le numéro marocain utilisé — ce n'est pas un problème d'infrastructure SOC, mais un problème côté opérateur/Telegram. À résoudre avant de pouvoir avancer sur 3.9 et 4.1.

> **suricata-to-influx.py :** Tourne actuellement comme processus manuel (`&`), pas comme service systemd — il ne redémarre pas automatiquement après un reboot de SOC-Center. À convertir en service avant toute démo ou usage prolongé.

> **rsyslog — bug corrigé :** Server-Cible envoyait ses logs vers la mauvaise IP NAT (192.168.7.174 au lieu de 192.168.7.181). Corrigé ; la chaîne de détection a été re-testée et validée de bout en bout après correction.

> **Suricata intra-DMZ :** Le trafic Kali-Red → Server-Cible reste dans VMnet3 et ne passe pas par pfSense — Suricata sur Server-Cible est indispensable pour le détecter.

> **pfSense règles :** Les actions sur pfSense nécessitent TOUJOURS une approbation admin (boutons Telegram). Le système autonome n'agit qu'au niveau OS/iptables.

> **GRE over IPsec :** Toujours tester les tunnels AVANT d'activer OSPF — un tunnel cassé fait planter le routage.

> **Snapshots VMware :** Créer un snapshot après chaque VM/service configuré avec succès.

> **Sécurité du document :** Ce rapport contient des secrets (tokens, mots de passe) en clair — usage interne uniquement, ne pas committer publiquement.

---

*Document : Rapport Complet — Plateforme SOC Intelligente*
*Version : 7.0 — 19 Juin 2026*
*Progression estimée : ~58-60%*
