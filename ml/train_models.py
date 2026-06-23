#!/usr/bin/env python3
"""
Entraîne 4 modèles ML sur les alertes Suricata :
  1. Random Forest       → classification attaques (supervisé)
  2. Isolation Forest    → détection anomalies    (non-supervisé)
  3. Logistic Regression → interprétabilité       (supervisé)
  4. K-Means             → clustering comportements (non-supervisé)

Déploiement : /opt/soc-ai/train_models.py
Prérequis   : python3 /opt/soc-ai/generate_dataset.py  (à lancer avant)
Usage       : python3 /opt/soc-ai/train_models.py
"""
import pandas as pd
import numpy as np
import joblib
import os
import json
from datetime import datetime

from sklearn.ensemble      import RandomForestClassifier, IsolationForest
from sklearn.linear_model  import LogisticRegression
from sklearn.cluster       import KMeans
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing  import StandardScaler
from sklearn.metrics        import (
    classification_report, accuracy_score, confusion_matrix,
    roc_auc_score, f1_score
)

# ── Config ─────────────────────────────────────────────────────────────────
DATASET_PATH = os.getenv("DATASET_PATH", "/opt/soc-ai/dataset_alerts.csv")
MODEL_DIR    = os.getenv("MODEL_DIR",    "/opt/soc-ai/models")

FEATURES = [
    "priority", "src_port", "dst_port", "packet_count",
    "alert_frequency", "hour_of_day", "is_internal_src",
    "bytes_total", "duration_sec",
]

os.makedirs(MODEL_DIR, exist_ok=True)

# ── Chargement des données ─────────────────────────────────────────────────
print("=" * 60)
print("🚀 SOC-AI — Pipeline d'entraînement ML")
print(f"   Démarré le : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 60)

df = pd.read_csv(DATASET_PATH)

# Filtrer uniquement les features disponibles
available_features = [f for f in FEATURES if f in df.columns]
X = df[available_features]
y = df["label"]

print(f"\n📂 Dataset chargé : {len(df)} lignes, {len(available_features)} features")
print(f"   Balance des classes : {dict(y.value_counts().sort_index())}")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ── Scaler ─────────────────────────────────────────────────────────────────
scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc  = scaler.transform(X_test)
joblib.dump(scaler, f"{MODEL_DIR}/scaler.pkl")
print("\n✅ Scaler StandardScaler sauvegardé")

# ── Méta-données ────────────────────────────────────────────────────────────
metadata = {
    "trained_at":    datetime.now().isoformat(),
    "n_samples":     len(df),
    "n_features":    len(available_features),
    "features":      available_features,
    "class_balance": {str(k): int(v) for k, v in y.value_counts().items()},
    "models":        {}
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. Random Forest
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 50)
print("🌲 [1/4] Random Forest Classifier")
print("─" * 50)

rf = RandomForestClassifier(
    n_estimators=200,
    max_depth=12,
    min_samples_leaf=2,
    random_state=42,
    class_weight="balanced",
    n_jobs=-1,
)
rf.fit(X_train, y_train)

y_pred_rf   = rf.predict(X_test)
y_proba_rf  = rf.predict_proba(X_test)[:, 1]
acc_rf      = accuracy_score(y_test, y_pred_rf)
f1_rf       = f1_score(y_test, y_pred_rf)
auc_rf      = roc_auc_score(y_test, y_proba_rf)
cv_rf       = cross_val_score(rf, X, y, cv=5, scoring="f1").mean()

print(f"Accuracy    : {acc_rf:.4f}")
print(f"F1-Score    : {f1_rf:.4f}")
print(f"AUC-ROC     : {auc_rf:.4f}")
print(f"CV F1 (5)   : {cv_rf:.4f}")
print("\nClassification Report :")
print(classification_report(y_test, y_pred_rf, target_names=["Faux Positif", "Vrai Positif"]))

# Feature importance
importances = pd.Series(rf.feature_importances_, index=available_features).sort_values(ascending=False)
print("Feature Importances :")
for feat, imp in importances.items():
    bar = "█" * int(imp * 40)
    print(f"  {feat:<20} {bar}  {imp:.4f}")

joblib.dump(rf, f"{MODEL_DIR}/random_forest.pkl")
metadata["models"]["random_forest"] = {
    "accuracy": round(acc_rf, 4), "f1": round(f1_rf, 4),
    "auc": round(auc_rf, 4), "cv_f1": round(cv_rf, 4)
}
print("\n✅ Random Forest sauvegardé")

# ─────────────────────────────────────────────────────────────────────────────
# 2. Isolation Forest
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 50)
print("🔍 [2/4] Isolation Forest (détection d'anomalies)")
print("─" * 50)

iso = IsolationForest(
    n_estimators=200,
    contamination=0.15,
    random_state=42,
    n_jobs=-1,
)
iso.fit(X_train_sc)

iso_preds  = iso.predict(X_test_sc)  # -1=anomalie, 1=normal
n_anomalies = (iso_preds == -1).sum()
print(f"Anomalies détectées (test set) : {n_anomalies} / {len(iso_preds)}")
print(f"Taux anomalie                  : {n_anomalies / len(iso_preds) * 100:.1f}%")

joblib.dump(iso, f"{MODEL_DIR}/isolation_forest.pkl")
metadata["models"]["isolation_forest"] = {
    "n_estimators": 200, "contamination": 0.15,
    "anomaly_rate_test": round(n_anomalies / len(iso_preds), 4)
}
print("✅ Isolation Forest sauvegardé")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Logistic Regression
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 50)
print("📊 [3/4] Logistic Regression")
print("─" * 50)

lr = LogisticRegression(
    random_state=42,
    class_weight="balanced",
    max_iter=2000,
    C=1.0,
    solver="lbfgs",
)
lr.fit(X_train_sc, y_train)

y_pred_lr  = lr.predict(X_test_sc)
y_proba_lr = lr.predict_proba(X_test_sc)[:, 1]
acc_lr     = accuracy_score(y_test, y_pred_lr)
f1_lr      = f1_score(y_test, y_pred_lr)
auc_lr     = roc_auc_score(y_test, y_proba_lr)

print(f"Accuracy : {acc_lr:.4f}")
print(f"F1-Score : {f1_lr:.4f}")
print(f"AUC-ROC  : {auc_lr:.4f}")
print("\nCoefficients LR :")
coefs = pd.Series(lr.coef_[0], index=available_features).sort_values(key=abs, ascending=False)
for feat, coef in coefs.items():
    sign = "↑" if coef > 0 else "↓"
    print(f"  {feat:<20} {sign}  {coef:.4f}")

joblib.dump(lr, f"{MODEL_DIR}/logistic_regression.pkl")
metadata["models"]["logistic_regression"] = {
    "accuracy": round(acc_lr, 4), "f1": round(f1_lr, 4), "auc": round(auc_lr, 4)
}
print("\n✅ Logistic Regression sauvegardée")

# ─────────────────────────────────────────────────────────────────────────────
# 4. K-Means Clustering
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 50)
print("🔵 [4/4] K-Means Clustering (4 clusters comportementaux)")
print("─" * 50)

km = KMeans(n_clusters=4, random_state=42, n_init=15, max_iter=500)
km.fit(X_train_sc)

cluster_labels  = km.predict(X_train_sc)
cluster_sizes   = pd.Series(cluster_labels).value_counts().sort_index()
cluster_inertia = km.inertia_

print(f"Inertie (within-cluster SSE) : {cluster_inertia:.2f}")
print("\nDistribution des clusters (train) :")
for cid, cnt in cluster_sizes.items():
    # Associer le taux d'attaques par cluster
    mask         = cluster_labels == cid
    attack_rate  = y_train.values[mask].mean() * 100
    bar          = "█" * (cnt // 10)
    print(f"  Cluster {cid} : {cnt:>4} échantillons | taux attaque {attack_rate:5.1f}% | {bar}")

# Nommer les clusters selon le taux d'attaque moyen
cluster_attack_rates = {}
for cid in range(4):
    mask = cluster_labels == cid
    cluster_attack_rates[cid] = y_train.values[mask].mean()

CLUSTER_NAMES = {
    k: ("🔴 Critique" if v > 0.6 else "🟠 Suspect" if v > 0.3 else "🟡 Modéré" if v > 0.1 else "🟢 Normal")
    for k, v in cluster_attack_rates.items()
}
print("\nClassification automatique des clusters :")
for cid, name in CLUSTER_NAMES.items():
    print(f"  Cluster {cid} → {name}")

joblib.dump(km, f"{MODEL_DIR}/kmeans.pkl")
with open(f"{MODEL_DIR}/cluster_names.json", "w", encoding="utf-8") as f:
    json.dump({str(k): v for k, v in CLUSTER_NAMES.items()}, f, ensure_ascii=False, indent=2)

metadata["models"]["kmeans"] = {
    "n_clusters": 4, "inertia": round(cluster_inertia, 2),
    "cluster_names": {str(k): v for k, v in CLUSTER_NAMES.items()}
}
print("\n✅ K-Means + cluster_names.json sauvegardés")

# ── Rapport final ──────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("🎯 RÉSUMÉ D'ENTRAÎNEMENT")
print("=" * 60)
print(f"  Random Forest       — Accuracy: {acc_rf:.3f} | F1: {f1_rf:.3f} | AUC: {auc_rf:.3f}")
print(f"  Logistic Regression — Accuracy: {acc_lr:.3f} | F1: {f1_lr:.3f} | AUC: {auc_lr:.3f}")
print(f"  Isolation Forest    — Anomaly rate: {n_anomalies / len(iso_preds) * 100:.1f}%")
print(f"  K-Means             — 4 clusters | Inertia: {cluster_inertia:.0f}")
print(f"\n📁 Modèles sauvegardés dans : {MODEL_DIR}/")
for fname in ["scaler.pkl", "random_forest.pkl", "isolation_forest.pkl",
              "logistic_regression.pkl", "kmeans.pkl", "cluster_names.json"]:
    path = f"{MODEL_DIR}/{fname}"
    print(f"   ✅ {fname}")

# Sauvegarder les métadonnées
with open(f"{MODEL_DIR}/metadata.json", "w", encoding="utf-8") as f:
    json.dump(metadata, f, ensure_ascii=False, indent=2)
print(f"   ✅ metadata.json")
print("\n🚀 Entraînement terminé !")
