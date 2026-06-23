# 🛡️ PROJET DE FIN D'ÉTUDES — PLATEFORME SOC INTELLIGENTE

> \\\*\\\*Réseau Hybride Multi-Sites · Supervision · Détection · Machine Learning · Dashboard Intelligent · Boucle d'amélioration continue\\\*\\\*

\---

## 📋 Vue d'ensemble

Ce projet consiste à concevoir et déployer une **plateforme SOC (Security Operations Center) complète**, open-source, autonome et intelligente sur une seule machine hôte (VMware). Elle couvre la conception réseau multi-sites sécurisée, la supervision temps réel, la détection d'intrusions, l'analyse par IA locale, une interface web multi-rôles, et un système de réponse autonome aux incidents.

|Paramètre|Valeur|
|-|-|
|**Machine hôte**|Windows 11 — i7 11ème gen — GTX 1650 Max-Q — 16GB RAM — 1TB SSD|
|**Hyperviseur**|VMware Workstation Pro|
|**IA locale (hôte)**|Ollama + Mistral 7B Q4 quantized (CUDA — GTX 1650)|
|**Langue du chatbot**|Français|
|**Durée cible**|10 jours (topologie + compréhension)|
|**Architecture**|Multi-sites (A1 / A2 / A3) reliés par GRE over IPsec + OpenVPN|

\---

## 🗂️ TABLE DES MATIÈRES

1. [Machine Hôte \& Ressources](#partie-0--machine-hôte--ressources)
2. [Architecture Multi-Sites](#partie-1--architecture-multi-sites)
3. [Inventaire Complet des VMs](#partie-2--inventaire-complet-des-vms)
4. [Configuration Réseau \& VPN](#partie-3--configuration-réseau--vpn)
5. [Système de Supervision \& Sécurité](#partie-4--système-de-supervision--sécurité)
6. [Interface Web Intelligente Multi-Rôles](#partie-5--interface-web-intelligente-multi-rôles)
7. [Pipeline IA — Filtrage \& Analyse](#partie-6--pipeline-ia--filtrage--analyse)
8. [Boucle d'Amélioration Continue](#partie-7--boucle-damélioration-continue)
9. [Chatbot Expert Réseau](#partie-8--chatbot-expert-réseau)
10. [Système de Réponse Autonome](#partie-9--système-de-réponse-autonome)
11. [Stack Technologique](#partie-10--stack-technologique)
12. [Plan de Déploiement 10 Jours](#partie-11--plan-de-déploiement-10-jours)
13. [Livrables](#partie-12--livrables)

\---

## PARTIE 0 — Machine Hôte \& Ressources

### 0.1 Spécifications Hôte

|Composant|Spécification|Rôle dans le projet|
|-|-|-|
|CPU|Intel i7 11ème gen|Exécution des VMs VMware|
|GPU|NVIDIA GTX 1650 Max-Q|Accélération CUDA pour Ollama/Mistral|
|RAM|16 GB|Partagée entre hôte + VMs|
|SSD|1 TB|Stockage VMs (\~150-200GB) + modèles IA (\~5GB)|
|OS|Windows 11|Hôte principal|

### 0.2 Allocation RAM

|Composant|RAM allouée|Notes|
|-|-|-|
|Windows 11 (hôte)|\~4 GB|Système de base|
|Ollama + Mistral 7B Q4|\~4 GB|Sur hôte, CUDA activé|
|VMs actives (groupe)|\~6-7 GB|Jamais toutes en même temps|
|**Marge de sécurité**|\~1 GB|Buffer|

> ⚠️ \\\*\\\*Règle absolue :\\\*\\\* Ne jamais lancer plus d'un groupe de VMs simultanément.

### 0.3 Installation Ollama sur Hôte Windows 11

```powershell
# 1. Télécharger et installer Ollama
# https://ollama.ai/download/windows

# 2. Installer CUDA Toolkit (pour GTX 1650)
# https://developer.nvidia.com/cuda-downloads

# 3. Télécharger Mistral 7B Q4 quantized (4GB au lieu de 8GB)
ollama pull mistral:7b-instruct-q4\\\_0

# 4. Exposer Ollama sur le réseau VMware (pour que les VMs y accèdent)
# Dans les variables d'environnement Windows :
OLLAMA\\\_HOST=0.0.0.0:11434

# 5. Vérifier que les VMs peuvent joindre l'hôte
# Depuis une VM : curl http://192.168.x.1:11434/api/generate
```

**Performance estimée avec GTX 1650 Max-Q :**

* Q4 quantized : \~8-12 tokens/seconde
* Latence première réponse : \~2-3 secondes
* Qualité : Très bonne pour l'analyse sécurité et le chat

### 0.4 Groupes de VMs (Gestion RAM)

Les VMs sont organisées en **3 groupes** selon l'activité :

|Groupe|VMs actives|RAM totale|Usage|
|-|-|-|-|
|**Groupe A** — SOC Core|pfSense-01 + VM-03 + Win10 + UbuntuDesktop-A1|\~6 GB|Développement quotidien|
|**Groupe B** — Attack Sim|pfSense-01 + pfSense-02 + VM-04 + Kali-Red|\~7 GB|Tests d'attaques|
|**Groupe C** — Full Defense|pfSense-01 + VM-03 + Kali-Blue + VM-02|\~6 GB|Analyse défensive|

\---

## PARTIE 1 — Architecture Multi-Sites

### 1.1 Vue Globale

```
                        INTERNET (NAT/WAN)
                               │
                    ┌──────────┴──────────┐
                    │     pfSense-01       │
                    │  PRIMARY (CARP VIP)  │
                    │  Firewall/Router/VPN │
                    └──────────┬──────────┘
                               │ pfsync + XMLRPC
                    ┌──────────┴──────────┐
                    │     pfSense-02       │
                    │  SECONDARY (CARP)    │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
     SITE A1 (LAN)        SITE A2 (DMZ)       SITE A3 (VPN/Secondary)
   192.168.10.0/24       192.168.20.0/24        192.168.30.0/24
          │                    │                    │
    ┌─────┴──────┐       ┌─────┴──────┐       ┌─────┴──────┐
    │ SOC + LAN  │       │    DMZ     │       │  Secondary  │
    │ Clients    │       │ Resources  │       │  Blue Team  │
    └────────────┘       └────────────┘       └────────────┘

    ◄─────────── GRE over IPsec Tunnels ────────────►
    ◄─────────── OpenVPN 10.0.0.0/24   ────────────►
```

### 1.2 Connexions Inter-Sites

|Tunnel|De|Vers|Protocole|Subnet tunnel|
|-|-|-|-|-|
|Tunnel 1|Site A1|Site A2|GRE over IPsec|172.16.1.0/30|
|Tunnel 2|Site A1|Site A3|GRE over IPsec|172.16.2.0/30|
|Tunnel 3|Site A2|Site A3|GRE over IPsec|172.16.3.0/30|
|VPN Client|Tous sites|pfSense-01|OpenVPN|10.0.0.0/24|

### 1.3 Plan d'Adressage IP Complet

|Site|Réseau|Passerelle|DHCP Range|VMnet|
|-|-|-|-|-|
|**Site A1 — LAN**|192.168.10.0/24|192.168.10.1|.100 → .200|VMnet2|
|**Site A2 — DMZ**|192.168.20.0/24|192.168.20.1|.100 → .200|VMnet3|
|**Site A3 — Secondary**|192.168.30.0/24|192.168.30.1|.100 → .200|VMnet4|
|**OpenVPN**|10.0.0.0/24|10.0.0.1|.10 → .50|—|
|**GRE Tunnel A1↔A2**|172.16.1.0/30|—|—|—|
|**GRE Tunnel A1↔A3**|172.16.2.0/30|—|—|—|
|**GRE Tunnel A2↔A3**|172.16.3.0/30|—|—|—|
|**pfsync (HA sync)**|192.168.99.0/30|—|—|VMnet5|
|**WAN (NAT)**|DHCP VMware|—|—|VMnet0 (NAT)|

\---

## PARTIE 2 — Inventaire Complet des VMs

### 2.1 Tableau Complet

|VM|Rôle|OS|RAM|CPU|Disk|VMnet(s)|IP fixe|Groupe|
|-|-|-|-|-|-|-|-|-|
|**pfSense-01**|Firewall Primary + CARP|pfSense CE|1 GB|1|20 GB|VMnet0 (WAN) + VMnet2 (LAN) + VMnet3 (DMZ) + VMnet4 (A3) + VMnet5 (sync)|192.168.10.1 / 192.168.20.1 / 192.168.30.1|A, B, C|
|**pfSense-02**|Firewall Secondary + CARP|pfSense CE|1 GB|1|20 GB|VMnet0 + VMnet2 + VMnet3 + VMnet4 + VMnet5|192.168.10.2 / 192.168.20.2 / 192.168.30.2|B|
|**VM-03**|Serveur SOC Principal|Ubuntu Server 22.04|2 GB|2|40 GB|VMnet2 (LAN)|192.168.10.10|A, C|
|**VM-02**|Router secondaire / VPN Client|Ubuntu Server 22.04|1 GB|1|20 GB|VMnet2 + VMnet4|192.168.10.20 / 192.168.30.10|C|
|**VM-04**|Serveur cible / Ressources|Ubuntu Server 22.04|1 GB|1|30 GB|VMnet3 (DMZ)|192.168.20.10|B|
|**Kali-Red (VM-05)**|Attaquant simulé Red Team|Kali Linux|1.5 GB|2|30 GB|VMnet3 (DMZ)|192.168.20.50|B|
|**Kali-Blue**|Analyste défensif Blue Team|Kali Linux|1.5 GB|2|30 GB|VMnet4 (A3)|192.168.30.20|C|
|**Win10-Client**|Poste client Windows|Windows 10|1.5 GB|2|40 GB|VMnet2 (LAN)|DHCP (\~192.168.10.100)|A|
|**Ubuntu-Desktop-A1**|Poste client Ubuntu (Site A1)|Ubuntu Desktop 22.04|1.5 GB|2|30 GB|VMnet2 (LAN)|DHCP (\~192.168.10.101)|A|
|**Ubuntu-Desktop-A3**|Poste client Ubuntu (Site A3)|Ubuntu Desktop 22.04|1.5 GB|2|30 GB|VMnet4 (A3)|DHCP (\~192.168.30.100)|C|
|**Ubuntu-Server-A3**|Serveur ressources secondaires|Ubuntu Server 22.04|1 GB|1|30 GB|VMnet4 (A3)|192.168.30.11|C|

### 2.2 Attribution VMnets

|VMnet|Type|Usage|Subnet|
|-|-|-|-|
|**VMnet0**|NAT (existant)|WAN pfSense (accès Internet)|DHCP VMware|
|**VMnet2**|Host-only|Site A1 — LAN|192.168.10.0/24|
|**VMnet3**|Host-only|Site A2 — DMZ|192.168.20.0/24|
|**VMnet4**|Host-only|Site A3 — Secondary|192.168.30.0/24|
|**VMnet5**|Host-only|pfsync — HA Sync pfSense|192.168.99.0/30|
|**VMnet6**|Host-only|Réservé (extensions futures)|—|
|**VMnet9+**|Disponibles|Réservés pour extensions|—|

### 2.3 Configuration Détaillée par VM

\---

#### 🔥 pfSense-01 (Primary)

```
OS          : pfSense CE 2.7.x
RAM         : 1 GB
CPU         : 1 vCPU
Disk        : 20 GB
Interfaces  :
  em0 → VMnet0  (WAN — DHCP NAT)
  em1 → VMnet2  (LAN — 192.168.10.1/24)
  em2 → VMnet3  (DMZ — 192.168.20.1/24)
  em3 → VMnet4  (A3  — 192.168.30.1/24)
  em4 → VMnet5  (SYNC — 192.168.99.1/30)

Services activés :
  ✅ DHCP Server (LAN, DMZ, A3)
  ✅ CARP (VIP sur LAN/DMZ/A3)
  ✅ pfsync (sync état firewall → pfSense-02)
  ✅ XMLRPC (sync config → pfSense-02)
  ✅ OpenVPN Server (10.0.0.0/24)
  ✅ GRE over IPsec (tunnels inter-sites)
  ✅ OSPF via FRRouting (package pfSense)
  ✅ Suricata IDS/IPS (package pfSense)
  ✅ NAT Outbound (LAN/DMZ → WAN)
```

\---

#### 🔥 pfSense-02 (Secondary)

```
OS          : pfSense CE 2.7.x
RAM         : 1 GB
CPU         : 1 vCPU
Disk        : 20 GB
Interfaces  : Identiques à pfSense-01
  em0 → VMnet0  (WAN)
  em1 → VMnet2  (LAN — 192.168.10.2/24)
  em2 → VMnet3  (DMZ — 192.168.20.2/24)
  em3 → VMnet4  (A3  — 192.168.30.2/24)
  em4 → VMnet5  (SYNC — 192.168.99.2/30)

Services activés :
  ✅ CARP (reçoit les VIPs en cas de panne Primary)
  ✅ pfsync (reçoit les états du Primary)
  ✅ XMLRPC (reçoit la config du Primary)
  ⚠️ Tous les services en STANDBY (actifs uniquement si Primary tombe)
```

\---

#### 🖥️ VM-03 — Serveur SOC Principal

```
OS          : Ubuntu Server 22.04 LTS
RAM         : 2 GB
CPU         : 2 vCPU
Disk        : 40 GB
VMnet       : VMnet2 (LAN)
IP          : 192.168.10.10/24
Gateway     : 192.168.10.1 (pfSense CARP VIP)

Services installés :
  ✅ InfluxDB 2.x        (port 8086)
  ✅ Grafana             (port 3000)
  ✅ Telegraf            (agent collecte)
  ✅ Suricata IDS        (mode détection)
  ✅ rsyslog             (centralisation logs)
  ✅ Wazuh Agent         (SIEM)
  ✅ Node.js + Express   (Backend API — port 5000)
  ✅ Neo4j Community     (port 7474 / 7687)
  ✅ Fail2Ban            (blocage automatique)

Connexion Ollama (hôte Windows) :
  URL : http://192.168.x.1:11434
  (IP hôte VMware sur VMnet2)
```

\---

#### 🖥️ VM-02 — Router Secondaire / VPN Client

```
OS          : Ubuntu Server 22.04 LTS
RAM         : 1 GB
CPU         : 1 vCPU
Disk        : 20 GB
VMnet       : VMnet2 (LAN) + VMnet4 (A3)
IP LAN      : 192.168.10.20/24
IP A3       : 192.168.30.10/24

Rôle        :
  ✅ Routeur inter-segments
  ✅ Client OpenVPN (tunnel vers pfSense-01)
  ✅ ip\\\_forward activé
  ✅ Routes statiques vers Site A3
```

\---

#### 🖥️ VM-04 — Serveur Cible / Ressources (Site A2)

```
OS          : Ubuntu Server 22.04 LTS
RAM         : 1 GB
CPU         : 1 vCPU
Disk        : 30 GB
VMnet       : VMnet3 (DMZ)
IP          : 192.168.20.10/24
Gateway     : 192.168.20.1

Services installés :
  ✅ iperf3              (tests bande passante)
  ✅ Apache2             (serveur web cible)
  ✅ OpenSSH             (cible SSH pour tests)
  ✅ Telegraf Agent      (métriques → VM-03)
  ✅ Wazuh Agent         (logs → VM-03)
  ⚠️ Volontairement vulnérable pour les tests Red Team
```

\---

#### 🔴 Kali-Red (VM-05) — Attaquant Simulé (Site A2)

```
OS          : Kali Linux Rolling
RAM         : 1.5 GB
CPU         : 2 vCPU
Disk        : 30 GB
VMnet       : VMnet3 (DMZ)
IP          : 192.168.20.50/24

Outils Red Team :
  ✅ nmap / masscan       (reconnaissance)
  ✅ arpspoof / ettercap  (ARP Spoofing)
  ✅ yersinia             (DHCP Starvation, STP attacks)
  ✅ macchanger           (MAC Spoofing)
  ✅ hping3               (flood / DoS)
  ✅ metasploit           (exploitation)
  ✅ hydra                (brute force)
  ✅ wireshark / tcpdump  (capture trafic)
```

\---

#### 🔵 Kali-Blue — Analyste Défensif (Site A3)

```
OS          : Kali Linux Rolling
RAM         : 1.5 GB
CPU         : 2 vCPU
Disk        : 30 GB
VMnet       : VMnet4 (A3)
IP          : 192.168.30.20/24

Outils Blue Team :
  ✅ Wireshark            (analyse trafic)
  ✅ Zeek (Bro)           (analyse passive réseau)
  ✅ ntopng               (monitoring trafic)
  ✅ CyberChef            (analyse forensique)
  ✅ Volatility           (analyse mémoire)
  ✅ TheHive              (gestion incidents — optionnel)
```

\---

#### 💻 Win10-Client (Site A1)

```
OS          : Windows 10 Pro
RAM         : 1.5 GB
CPU         : 2 vCPU
Disk        : 40 GB
VMnet       : VMnet2 (LAN)
IP          : DHCP (192.168.10.100+)

Usage :
  ✅ Poste employé standard
  ✅ Accès interface web SOC (navigateur)
  ✅ Cible pour tests d'attaques internes
  ✅ Génération de trafic réaliste
```

\---

#### 💻 Ubuntu-Desktop-A1 (Site A1)

```
OS          : Ubuntu Desktop 22.04
RAM         : 1.5 GB
CPU         : 2 vCPU
Disk        : 30 GB
VMnet       : VMnet2 (LAN)
IP          : DHCP (192.168.10.101+)

Usage :
  ✅ Poste employé Linux
  ✅ Accès interface web SOC
  ✅ Tests de navigation / comportement utilisateur
```

\---

#### 💻 Ubuntu-Desktop-A3 (Site A3)

```
OS          : Ubuntu Desktop 22.04
RAM         : 1.5 GB
CPU         : 2 vCPU
Disk        : 30 GB
VMnet       : VMnet4 (A3)
IP          : DHCP (192.168.30.100+)

Usage :
  ✅ Poste employé Site A3 (secondaire)
  ✅ Test accès inter-sites via VPN
```

\---

#### 🖥️ Ubuntu-Server-A3 (Site A3)

```
OS          : Ubuntu Server 22.04
RAM         : 1 GB
CPU         : 1 vCPU
Disk        : 30 GB
VMnet       : VMnet4 (A3)
IP          : 192.168.30.11/24

Services :
  ✅ Serveur de fichiers (Samba)
  ✅ Telegraf Agent
  ✅ Wazuh Agent
  ✅ Ressources secondaires du site A3
```

\---

## PARTIE 3 — Configuration Réseau \& VPN

### 3.1 CARP — Haute Disponibilité pfSense

```
pfSense-01 (Primary)  ←── pfsync (VMnet5) ──→  pfSense-02 (Secondary)
      │                                                  │
   MASTER                                            BACKUP
      │                                                  │
   VIP CARP partagée : 192.168.10.254 (LAN)
                       192.168.20.254 (DMZ)
                       192.168.30.254 (A3)
```

**Étapes de configuration CARP :**

1. pfSense-01 : Firewall → Virtual IPs → Ajouter VIP CARP par interface
2. pfSense-01 : System → High Avail. Sync → activer pfsync + XMLRPC
3. pfSense-02 : Synchroniser depuis pfSense-01 automatiquement
4. Test : Éteindre pfSense-01 → pfSense-02 prend les VIPs en < 1 sec

### 3.2 GRE over IPsec — Tunnels Inter-Sites

**Pourquoi GRE over IPsec ?**

* GRE seul = pas de chiffrement
* IPsec seul = pas de routage multicast/OSPF
* GRE over IPsec = tunnel chiffré + support OSPF + multicast ✅

**Configuration Tunnel A1 ↔ A2 (exemple) :**

```
# Sur pfSense-01 (Site A1)
Phase 1 IPsec :
  Remote Gateway : 192.168.20.1 (pfSense côté DMZ)
  Authentication : Pre-Shared Key
  Encryption     : AES-256 + SHA-256 + DH Group 14

Phase 2 IPsec :
  Local Network  : 0.0.0.0/0 (transport mode pour GRE)
  Remote Network : 0.0.0.0/0
  Protocol       : ESP — AES-128

Interface GRE :
  Tunnel Source  : 192.168.10.1
  Tunnel Dest    : 192.168.20.1
  Local addr GRE : 172.16.1.1/30
  Remote addr GRE: 172.16.1.2/30
```

### 3.3 OpenVPN — Accès Distant

```
Mode           : Server (tun)
Protocole      : UDP 1194
Subnet         : 10.0.0.0/24
Auth           : PKI (certificats — Easy-RSA)
Chiffrement    : AES-256-GCM
Clients        : VM-02, Kali-Blue, Ubuntu-Desktop-A3
```

### 3.4 OSPF — Routage Dynamique

Installé via package FRRouting sur pfSense ou directement sur VM-02/VM-03.

```
Zone 0 (Backbone) : 192.168.10.0/24 (LAN Site A1)
Zone 1            : 192.168.20.0/24 (DMZ Site A2)
Zone 2            : 192.168.30.0/24 (Secondary Site A3)
Zone 3            : 10.0.0.0/24    (OpenVPN)
Tunnels GRE       : Annoncés dans OSPF (redistribution)
```

### 3.5 NAT \& Règles Firewall

|Règle|Source|Destination|Action|Port|
|-|-|-|-|-|
|LAN → WAN|192.168.10.0/24|Any|NAT Masquerade|Any|
|DMZ → WAN|192.168.20.0/24|Any|NAT Masquerade|Any|
|LAN → DMZ|192.168.10.0/24|192.168.20.10|Allow|80, 443, 22|
|DMZ → LAN|192.168.20.0/24|192.168.10.0/24|Block|All|
|VPN → LAN|10.0.0.0/24|192.168.10.0/24|Allow|All|
|WAN → SOC|Any|192.168.10.10|Allow|3000, 5000 (via NAT)|

\---

## PARTIE 4 — Système de Supervision \& Sécurité

### 4.1 Architecture de Supervision

```
Réseau (trafic, logs, métriques)
         │
    ┌────┼──────────────────┐
    │    │                  │
Telegraf  Suricata       rsyslog
(métriques)(IDS/IPS)     (logs)
    │    │                  │
    └────┴──────────────────┘
                │
           InfluxDB 2.x (VM-03)
                │
           ┌────┴────────┐
           │             │
        Grafana      AlertManager
     (Dashboards)   (Notifications)
                         │
               ┌─────────┴──────────┐
           Telegram Bot          Email SMTP
          (principal)            (backup)
```

### 4.2 Outils de Supervision (tous gratuits)

|Outil|Rôle|Installé sur|
|-|-|-|
|**Telegraf**|Collecte métriques CPU/RAM/réseau/SNMP|Toutes VMs|
|**Suricata IDS/IPS**|Détection intrusions + règles ET Open|pfSense-01 + VM-03|
|**rsyslog**|Centralisation logs système|VM-03 (serveur) + toutes VMs (clients)|
|**Wazuh**|SIEM — corrélation événements|VM-03 (serveur) + agents sur toutes VMs|
|**Zeek (Bro)**|Analyse passive trafic réseau|Kali-Blue|
|**ntopng Community**|Monitoring trafic temps réel|VM-03|
|**InfluxDB 2.x**|Base de données Time Series|VM-03|
|**Grafana**|Visualisation dashboards|VM-03|
|**Fail2Ban**|Blocage automatique IPs|VM-03 + VM-04|
|**AlertManager**|Gestion et routage alertes|VM-03|

### 4.3 Buckets InfluxDB

|Bucket|Contenu|Rétention|
|-|-|-|
|`metrics`|CPU, RAM, réseau, uptime|30 jours|
|`logs`|Logs système, pfSense, OpenVPN|15 jours|
|`suricata\\\_alerts`|Alertes IDS/IPS avec sévérité|60 jours|
|`incidents`|Incidents confirmés + rapports|1 an|
|`wazuh\\\_events`|Événements SIEM corrélés|60 jours|
|`gre\\\_tunnels`|Métriques tunnels GRE/IPsec|30 jours|

### 4.4 Dashboards Grafana

|Dashboard|Contenu|
|-|-|
|📊 Global|Santé réseau, uptime, VMs|
|🔥 Sécurité|Alertes Suricata temps réel|
|🌐 Réseau|Bande passante, latence, OSPF, tunnels GRE|
|🖥️ VMs|CPU/RAM/Disk par machine|
|🚨 Incidents|Timeline incidents classifiés|
|🤖 IA|Taux vrais/faux positifs ML|
|🔒 VPN|État tunnels OpenVPN + GRE over IPsec|

### 4.5 Notifications Telegram Bot

**Pourquoi Telegram ?**
Gratuit · Bot API simple · Boutons interactifs inline · Mobile natif · Fiable · Parfait pour la réponse 3 minutes

**Setup :**

```
1. Créer bot via @BotFather → TOKEN
2. Obtenir CHAT\\\_ID (groupe SOC dédié)
3. Intégrer dans AlertManager (webhook)
4. Intégrer dans backend Python (réponse autonome)
```

**Niveaux d'alerte :**

|Niveau|Emoji|Déclencheur|
|-|-|-|
|INFO|ℹ️|Connexion VPN, service redémarré|
|WARNING|⚠️|Port scan, pic bande passante|
|CRITICAL|🚨|ARP Spoofing, DHCP Flood, intrusion|
|AUTONOME|🤖|Action prise sans approbation|
|APPROBATION|🔐|Demande règle pfSense (attend admin)|

\---

## PARTIE 5 — Interface Web Intelligente Multi-Rôles

### 5.1 Backend API (VM-03)

```
Node.js + Express
  ├── REST API              (endpoints par rôle)
  ├── WebSocket (socket.io) (temps réel)
  ├── JWT Auth              (rôles : employee / expert / admin)
  ├── InfluxDB connector    (métriques + alertes)
  ├── Neo4j connector       (topologie réseau)
  ├── Ollama connector      (http://HOST\\\_IP:11434)
  └── Telegram Bot webhook  (réponse interactive)
```

### 5.2 Rôles \& Accès

|Rôle|Authentification|Interface|
|-|-|-|
|**Employé**|ID employé valide|Encyclopédie attaques + formulaire feedback|
|**Expert / Blue Team**|ID expert|Tout employé + dashboard technique + logs|
|**Admin**|ID admin + MFA|Tout expert + Neo4j topology + gestion incidents + config IA|

### 5.3 Interface Employé — Encyclopédie des Attaques

#### 🔴 Attaques Internes

|Attaque|Description courte|
|-|-|
|**ARP Spoofing**|Usurpation d'adresse MAC via faux paquets ARP|
|**DHCP Spoofing**|Faux serveur DHCP — redirection trafic|
|**DHCP Starvation**|Épuisement du pool DHCP|
|**MAC Flooding**|Saturation table CAM switch → comportement hub|
|**MAC Spoofing / Stealing**|Usurpation adresse MAC légitime|
|**Port Flooding**|Saturation ports réseau (DoS interne)|
|**MITM**|Interception trafic entre deux hôtes|
|**Rogue Access Point**|Faux point d'accès Wi-Fi interne|

#### 🌐 Attaques Externes

|Attaque|Description courte|
|-|-|
|**Port Scanning**|Reconnaissance ports ouverts (nmap)|
|**Brute Force**|Tentatives massives de connexion|
|**DDoS**|Saturation bande passante / service|
|**SQL Injection**|Injection code SQL dans formulaires|
|**Phishing**|Email frauduleux — vol credentials|
|**CVE Exploitation**|Exploitation vulnérabilités connues|
|**VPN Credential Attack**|Attaque portail VPN|
|**Ransomware**|Chiffrement données + rançon|

### 5.4 Interface Admin — Topologie Neo4j

```cypher
-- Exemple de relations dans Neo4j
(Win10:Host {ip: "192.168.10.100"}) -\\\[:TALKS\\\_TO]-> (VM04:Host {ip: "192.168.20.10"})
(KaliRed:Host {ip: "192.168.20.50"}) -\\\[:ATTACK {type: "ARP\\\_SPOOF"}]-> (VM04:Host)
(pfSense01:Router) -\\\[:ROUTES]-> (LAN:Network {subnet: "192.168.10.0/24"})
(VM03:Host) -\\\[:BLOCKED]-> (KaliRed:Host)
```

**Légende nœuds :**

* 🟢 Vert : Hôte sain
* 🔵 Bleu : Connexion normale
* 🔴 Rouge : Sous attaque
* 🟠 Orange : Suspect / attaquant
* ⬛ Noir : Isolé / bloqué

### 5.5 Catégorisation des Notifications (Admin)

```
📁 Notifications
├── 🚨 Attaques
│   ├── Internes
│   │   ├── ARP Spoofing
│   │   ├── MAC Flooding
│   │   ├── DHCP Spoofing
│   │   ├── DHCP Starvation
│   │   ├── MAC Stealing
│   │   └── Port Flooding
│   └── Externes
│       ├── Port Scanning
│       ├── Brute Force
│       └── DDoS
├── ⚠️ Anomalies
│   ├── Pic bande passante
│   ├── Hôte inconnu détecté
│   └── Connexion hors horaires
├── 🔐 En attente d'approbation
│   └── Règles firewall pfSense
├── ℹ️ Informations
└── ✅ Résolus
```

\---

## PARTIE 6 — Pipeline IA — Filtrage \& Analyse

### 6.1 Architecture

```
Données brutes (Suricata / Wazuh / Telegraf)
         │
    InfluxDB 2.x (VM-03)
         │
    Python Backend (VM-03)
         │
    ┌────┴────────────────────────┐
    │                             │
Modèles ML (Scikit-learn)   Ollama API
VM-03                       HOST:11434
    │                             │
    └──────────┬──────────────────┘
               │
    Résultat enrichi (JSON)
    • Type d'attaque
    • Vrai / Faux Positif
    • Niveau de risque (1-10)
    • Explication en français
    • Recommandation d'action
               │
    Backend API → Frontend + Telegram
```

### 6.2 Modèles ML (Scikit-learn)

|Modèle|Usage|
|-|-|
|**Random Forest**|Classification type d'attaque|
|**Isolation Forest**|Détection anomalies comportementales|
|**Logistic Regression**|Vrai / Faux positif|
|**K-Means**|Clustering comportements similaires|

### 6.3 Ollama + Mistral 7B (Hôte Windows 11)

```powershell
# Installation (hôte Windows 11)
# 1. Installer CUDA Toolkit : https://developer.nvidia.com/cuda-downloads
# 2. Installer Ollama : https://ollama.ai/download/windows
# 3. Pull le modèle Q4 quantized
ollama pull mistral:7b-instruct-q4\\\_0

# 4. Lancer avec accès réseau VMware
$env:OLLAMA\\\_HOST = "0.0.0.0:11434"
ollama serve
```

**Prompt système de base :**

```
Tu es un expert en cybersécurité et administration réseau.
Tu connais parfaitement notre infrastructure :
- Sites : A1 (LAN 192.168.10.0/24), A2 (DMZ 192.168.20.0/24), A3 (192.168.30.0/24)
- Firewall : pfSense CE en HA (CARP) — Primary 192.168.10.1 / Secondary 192.168.10.2
- VPN : GRE over IPsec (inter-sites) + OpenVPN (10.0.0.0/24)
- Routage : OSPF (FRRouting)
- SOC : VM-03 (192.168.10.10) — InfluxDB, Grafana, Suricata, Wazuh
- Attaquant simulé : Kali-Red (192.168.20.50 — Site A2)
- Blue Team : Kali-Blue (192.168.30.20 — Site A3)
Tu réponds UNIQUEMENT en français, de manière précise et professionnelle.
```

\---

## PARTIE 7 — Boucle d'Amélioration Continue

### 7.1 Google Forms — Collecte Feedback

Accessible à **tous les employés** avec ID valide.

|Question|Type|Objectif|
|-|-|-|
|ID Employé|Texte|Validation identité|
|Date/heure incident|Date|Contexte temporel|
|Comportement suspect observé ?|OUI/NON|Déclencheur|
|Description|Texte long|Enrichissement IA|
|L'alerte était-elle pertinente ?|Échelle 1-5|Qualité détection|
|C'était un vrai incident ?|OUI/NON/NSP|Label ML|
|L'action automatique était appropriée ?|OUI/NON/Partielle|Évaluation réponse|
|Commentaires|Texte long|Amélioration continue|

### 7.2 Pipeline Feedback → Réentraînement

```
Google Forms → Google Sheets → CSV Export (API)
     │
Python Preprocessing (VM-03)
  • Nettoyage / Encodage / Feature Engineering
     │
Jupyter Notebook
  • Réentraînement modèles Scikit-learn
  • Validation croisée
  • Sauvegarde modèle (joblib)
     │
VM-03 API mise à jour → Meilleures prédictions
```

### 7.3 Amélioration Chatbot

Les retours enrichissent la **base de connaissance** de Mistral :

* Incidents réels documentés → contexte système LLM enrichi
* Faux positifs récurrents → règles d'exclusion ajoutées
* Terminologie projet → prompt système affiné
* Niveau sécurité estimé → ajuste seuils d'alerte

\---

## PARTIE 8 — Chatbot Expert Réseau

### 8.1 Sources de Connaissance

#### Statique (fichier YAML — VM-03)

Contient toute la topologie, IPs, rôles, services de l'infrastructure.

#### Dynamique (APIs temps réel)

* pfSense API → état interfaces, règles, VPN
* InfluxDB → métriques actuelles
* Suricata logs → dernières alertes
* Neo4j → topologie réseau live

### 8.2 Exemples Q\&R

|Question|Réponse|
|-|-|
|"Ce site a-t-il un failover VPN ?"|"Oui, pfSense en CARP + GRE over IPsec redondant entre les 3 sites"|
|"Adresse interface management ?"|"192.168.10.10 (VM-03), accessible port 3000 (Grafana) et 5000 (API)"|
|"VM-04 est en ligne ?"|"Oui, CPU 12%, RAM 45%, dernière métrique il y a 28 secondes"|
|"Attaques en cours ?"|"ARP Spoofing depuis 192.168.20.50 (Kali-Red) → VM-04, détecté il y a 2 min"|
|"Les tunnels GRE sont actifs ?"|"Tunnel A1↔A2 : UP / Tunnel A1↔A3 : UP / Tunnel A2↔A3 : UP"|

### 8.3 Interface

* Composant React flottant (accessible toutes pages)
* Historique conversation par session
* Bouton "Escalader via Telegram"
* Réponses en français uniquement
* Réponses enrichies avec données temps réel

\---

## PARTIE 9 — Système de Réponse Autonome

### 9.1 Logique de Décision

```
Anomalie détectée
      │
Évaluation sévérité (ML + Mistral)
      │
  ┌───┴──────────────────┐
  │                      │
INFO/WARNING           CRITICAL/ATTACK
  │                      │
Notification           Notification Telegram
Telegram               + ⏱️ Timer 3 minutes
(informatif)                  │
                   ┌──────────┴──────────┐
                   │                     │
             Admin répond          Pas de réponse
             (choisit action)      → Réponse Autonome
```

### 9.2 Actions Autonomes (sans approbation)

|Menace|Action autonome|Niveau|
|-|-|-|
|ARP Spoofing actif|Isoler hôte attaquant (iptables) + Flag Neo4j|OS/VM|
|MAC Flooding|Bloquer IP source (iptables)|OS/VM|
|DHCP Starvation|Bloquer IP source + Rate limit DHCP|OS/VM|
|Port Scan intensif|Fail2Ban déclenché|OS/VM|
|Brute Force SSH|Fail2Ban + blocage IP|OS/VM|
|Intrusion confirmée|Isoler VM (réseau off) + Snapshot VMware|VM + Hyperviseur|

> 🔐 \\\*\\\*Règles pfSense\\\*\\\* → Toujours en attente d'approbation admin (boutons Telegram)

### 9.3 Rapport Automatique Post-Incident

```
🤖 RAPPORT D'ACTION AUTONOME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 2025-03-15 — 02:47:33
🚨 Incident    : ARP Spoofing
🖥️ Attaquant   : 192.168.20.50 (Kali-Red — Site A2)
🎯 Cible       : 192.168.20.10 (VM-04)
📡 Site        : A2 (DMZ)

⚡ ACTIONS EFFECTUÉES :
1. Isolation réseau Kali-Red via iptables
2. Flag ATTACK ajouté dans Neo4j
3. Snapshot VMware VM-04 créé
4. Alertes archivées dans InfluxDB

🧠 ANALYSE IA (Mistral 7B) :
"847 paquets ARP gratuits en 12 secondes ciblant
192.168.20.1. ARP Spoofing MITM confirmé. Confiance : 94%."

⏳ VOTRE DÉCISION :
\\\[✅ Maintenir blocage] \\\[🔓 Débloquer] \\\[🔐 Appliquer règle pfSense]
```

### 9.4 Intégration Telegram Bot Interactive

```python
@bot.callback\\\_query\\\_handler(func=lambda call: True)
def handle\\\_response(call):
    if call.data == "maintain\\\_block":
        # Demande approbation règle pfSense
        bot.send\\\_message(chat\\\_id,
            "🔐 Appliquer sur pfSense ? \\\[Approuver] \\\[Rejeter]")

    elif call.data == "unblock":
        remove\\\_iptables\\\_rule(ip\\\_source)
        bot.send\\\_message(chat\\\_id, "🔓 Hôte débloqué. Surveillance renforcée activée.")

    elif call.data == "pfsense\\\_rule":
        # Attente approbation admin → puis appel API pfSense
        pfsense\\\_api.add\\\_firewall\\\_rule(ip\\\_source, action="block")
        bot.send\\\_message(chat\\\_id, "✅ Règle pfSense appliquée.")
```

\---

## PARTIE 10 — Stack Technologique Complète

### Infrastructure

|Composant|Technologie|Gratuit|
|-|-|-|
|Firewall / VPN|pfSense CE + CARP + OpenVPN + GRE/IPsec|✅|
|Hyperviseur|VMware Workstation Pro|⚠️ (étudiant)|
|Routage dynamique|FRRouting OSPF|✅|

### Supervision \& Sécurité

|Composant|Technologie|Gratuit|
|-|-|-|
|Métriques|Telegraf|✅|
|IDS/IPS|Suricata + ET Open Rules|✅|
|SIEM|Wazuh Community|✅|
|Analyse trafic|Zeek (Bro)|✅|
|Monitoring trafic|ntopng Community|✅|
|Logs|rsyslog|✅|
|Time Series DB|InfluxDB 2.x|✅|
|Visualisation|Grafana|✅|
|Notifications|Telegram Bot API|✅|
|Blocage auto|Fail2Ban|✅|

### Intelligence Artificielle

|Composant|Technologie|Gratuit|
|-|-|-|
|LLM local (hôte Win11)|Ollama + Mistral 7B Q4 (CUDA GTX 1650)|✅|
|ML Classification|Scikit-learn|✅|
|Notebooks|Jupyter|✅|
|Data pipeline|Python + Pandas|✅|

### Backend \& Frontend

|Composant|Technologie|Gratuit|
|-|-|-|
|API Backend|Node.js + Express|✅|
|Auth|JWT + bcrypt|✅|
|Graphe réseau DB|Neo4j Community|✅|
|Frontend|React + TypeScript|✅|
|Graphe interactif|react-force-graph|✅|
|Temps réel|socket.io|✅|

### Feedback

|Composant|Technologie|Gratuit|
|-|-|-|
|Formulaire|Google Forms|✅|
|Stockage|Google Sheets|✅|
|Export|Google Sheets API|✅|

\---

## PARTIE 11 — Plan de Déploiement 10 Jours

> ⚠️ Plan réaliste en \\\*\\\*2 phases\\\*\\\* pour garantir un projet présentable en 10 jours.

### PHASE 1 — Fondation (Jours 1-7) ← Demo-ready

#### Jour 1 — Réseau de base

* \[ ] Créer toutes les VMs dans VMware (sans les démarrer)
* \[ ] Configurer les VMnets (2, 3, 4, 5)
* \[ ] Installer et configurer pfSense-01 (interfaces, NAT, DHCP)
* \[ ] Tester connectivité LAN → WAN

#### Jour 2 — Haute Disponibilité \& VPN

* \[ ] Configurer pfSense-02 + CARP
* \[ ] Tester failover CARP (éteindre pfSense-01)
* \[ ] Configurer OpenVPN (PKI, serveur, clients)
* \[ ] Configurer GRE over IPsec (tunnels A1↔A2, A1↔A3)

#### Jour 3 — Routage \& Segmentation

* \[ ] Installer FRRouting sur VM-02
* \[ ] Configurer OSPF (zones par site)
* \[ ] Règles firewall pfSense par zone
* \[ ] Test connectivité inter-sites via tunnels GRE
* \[ ] Démarrer Groupe A (pfSense-01 + VM-03 + Win10)

#### Jour 4 — Supervision Collecte

* \[ ] Installer InfluxDB 2.x + créer buckets
* \[ ] Installer Telegraf sur toutes VMs actives
* \[ ] Installer Suricata + règles ET Open
* \[ ] Configurer rsyslog centralisé → VM-03
* \[ ] Installer Wazuh (serveur VM-03 + agents)

#### Jour 5 — Visualisation \& Alertes

* \[ ] Installer Grafana + créer 6 dashboards
* \[ ] Configurer AlertManager
* \[ ] Créer bot Telegram (@BotFather)
* \[ ] Intégrer Grafana → Telegram
* \[ ] Tester alertes end-to-end

#### Jour 6 — IA sur Hôte + Backend

* \[ ] Installer CUDA Toolkit sur Windows 11
* \[ ] Installer Ollama + pull mistral:7b-instruct-q4\_0
* \[ ] Exposer Ollama sur réseau VMware (OLLAMA\_HOST=0.0.0.0)
* \[ ] Développer API Node.js + Express (VM-03)
* \[ ] Système JWT + gestion des 3 rôles
* \[ ] Intégration InfluxDB ↔ Backend

#### Jour 7 — Frontend + Neo4j

* \[ ] Installer Neo4j Community (VM-03)
* \[ ] Bootstrap React + TypeScript
* \[ ] Interface login (3 rôles)
* \[ ] Interface Employé (encyclopédie attaques)
* \[ ] Interface Expert (dashboard technique)
* \[ ] Interface Admin (Neo4j topology + notifications)

\---

### PHASE 2 — Intelligence \& Autonomie (Jours 8-10)

#### Jour 8 — ML + Chatbot Expert

* \[ ] Pipeline Python ML (Scikit-learn)
* \[ ] Entraînement modèles (données synthétiques)
* \[ ] Développement chatbot (Ollama + config statique/dynamique)
* \[ ] Intégration chatbot dans frontend React
* \[ ] Google Forms + pipeline feedback

#### Jour 9 — Réponse Autonome

* \[ ] Système timer 3 minutes
* \[ ] Actions autonomes (iptables, Fail2Ban)
* \[ ] Génération rapport automatique (Mistral)
* \[ ] Boutons interactifs Telegram (inline keyboard)
* \[ ] Workflow approbation règles pfSense

#### Jour 10 — Tests \& Soutenance

* \[ ] Groupe B : Lancer Kali-Red → simuler ARP Spoofing
* \[ ] Vérifier détection Suricata + Wazuh
* \[ ] Tester réponse autonome (blocage + rapport Telegram)
* \[ ] Tester chatbot (10 questions types)
* \[ ] Tester formulaire → réentraînement
* \[ ] Préparer slides de présentation
* \[ ] Demo live : attaque → détection → réponse autonome → rapport

\---

## PARTIE 12 — Livrables

|Livrable|Description|Format|
|-|-|-|
|📄 Rapport technique|Documentation complète du projet|PDF / Markdown|
|💻 Code source|Backend, Frontend, scripts Python, configs|GitHub (privé)|
|📊 Dashboard fonctionnel|Grafana + Interface Web déployés|Demo live|
|🗺️ Schéma d'architecture|Diagramme réseau multi-sites complet|Draw.io|
|🤖 Modèles ML|Pipeline + modèles entraînés|Pickle / Joblib|
|📋 Manuel utilisateur|Guide par rôle (Employé, Expert, Admin)|PDF|
|🎤 Présentation|Slides + demo en direct|PowerPoint + Demo|

\---

## 📌 Notes Critiques

> \\\*\\\*RAM :\\\*\\\* Ne jamais lancer tous les groupes simultanément. Ollama Q4 sur hôte libère \\\~4GB pour les VMs.

> \\\*\\\*Ollama réseau :\\\*\\\* L'IP hôte sur VMnet2 est généralement `192.168.10.1` (passerelle VMware). Vérifier avec `ipconfig` sur Windows 11 → adaptateur VMnet2.

> \\\*\\\*pfSense règles :\\\*\\\* Les actions sur pfSense nécessitent TOUJOURS approbation admin. Le système autonome agit uniquement au niveau OS/iptables.

> \\\*\\\*Snapshots VMware :\\\*\\\* Créer un snapshot de chaque VM après configuration de base — point de restauration en cas de problème.

> \\\*\\\*GRE over IPsec :\\\*\\\* Tester les tunnels AVANT d'activer OSPF. Un tunnel GRE cassé fait planter le routage OSPF.

> \\\*\\\*Mistral Q4 vs Full :\\\*\\\* Q4 quantized = 4GB RAM, \\\~90% de la qualité du modèle complet. Largement suffisant pour l'analyse sécurité.

\---

*Document : PROJET DE FIN D'ÉTUDES — Plateforme SOC Intelligente Open Source
Version : 2.0 — Architecture complète multi-sites
Révision : Inclut GRE over IPsec, CARP, multi-sites A1/A2/A3, Ollama sur hôte Win11 (CUDA), groupes VMs, VMnets 2-5*

