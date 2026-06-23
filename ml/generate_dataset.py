#!/usr/bin/env python3
"""
Génère un dataset synthétique d'alertes Suricata pour entraîner les modèles ML.
Labels : 0 = faux positif, 1 = vrai positif (attaque réelle)

Déploiement : /opt/soc-ai/generate_dataset.py
Usage       : python3 /opt/soc-ai/generate_dataset.py
"""
import pandas as pd
import numpy as np
import random
import os

np.random.seed(42)
random.seed(42)

N = 2000
OUTPUT_PATH = os.getenv("DATASET_PATH", "/opt/soc-ai/dataset_alerts.csv")

SENSITIVE_PORTS = [22, 3306, 21, 23, 3389, 5900, 6379, 27017]
COMMON_PORTS    = [80, 443, 8080, 8443, 53, 25, 110, 143]
ALL_PORTS       = SENSITIVE_PORTS + COMMON_PORTS

data = {
    "priority":        np.random.choice([1, 2, 3], N, p=[0.3, 0.4, 0.3]),
    "src_port":        np.random.randint(1024, 65535, N),
    "dst_port":        np.random.choice(ALL_PORTS, N),
    "packet_count":    np.random.randint(1, 500, N),
    "alert_frequency": np.random.randint(1, 50, N),
    "hour_of_day":     np.random.randint(0, 24, N),
    "is_internal_src": np.random.choice([0, 1], N, p=[0.4, 0.6]),
    "bytes_total":     np.random.randint(64, 1_500_000, N),
    "duration_sec":    np.random.randint(0, 3600, N),
}

df = pd.DataFrame(data)

# ── Règles de labellisation ────────────────────────────────────────────────
# Attaque si :
#   priorité 1 + fréquence élevée + port sensible
#   OU  priorité 1 + volume élevé + externe
#   OU  scan de ports (beaucoup de paquets courts)
cond_attack_1 = (
    (df["priority"] == 1) &
    (df["alert_frequency"] > 15) &
    (df["dst_port"].isin(SENSITIVE_PORTS))
)
cond_attack_2 = (
    (df["priority"] == 1) &
    (df["bytes_total"] > 1_000_000) &
    (df["is_internal_src"] == 0)
)
cond_attack_3 = (
    (df["packet_count"] > 300) &
    (df["duration_sec"] < 10) &
    (df["priority"] <= 2)
)

df["label"] = (cond_attack_1 | cond_attack_2 | cond_attack_3).astype(int)

# ── Bruit aléatoire (10%) ──────────────────────────────────────────────────
noise_idx = np.random.choice(df.index, size=int(N * 0.1), replace=False)
df.loc[noise_idx, "label"] = 1 - df.loc[noise_idx, "label"]

# ── Sauvegarde ─────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
df.to_csv(OUTPUT_PATH, index=False)

n_attacks  = df["label"].sum()
n_fp       = len(df) - n_attacks
ratio      = round(n_attacks / len(df) * 100, 1)

print(f"✅ Dataset généré : {len(df)} lignes")
print(f"   ├── Vrais positifs (attaques) : {n_attacks}  ({ratio}%)")
print(f"   ├── Faux positifs             : {n_fp}  ({100 - ratio}%)")
print(f"   └── Sauvegardé dans           : {OUTPUT_PATH}")
print()
print("Distribution des priorités :")
print(df["priority"].value_counts().sort_index().to_string())
