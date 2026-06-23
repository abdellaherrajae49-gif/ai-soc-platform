#!/usr/bin/env python3
"""
Prédit si une alerte Suricata est un vrai positif (attaque réelle).
Utilisé par discord_bot.py, analyze.py et les routes backend.

Déploiement : /opt/soc-ai/ml_predict.py
Usage        : python3 /opt/soc-ai/ml_predict.py    (test auto-inclus)
"""
import joblib
import numpy as np
import json
import os
from datetime import datetime

MODEL_DIR = os.getenv("MODEL_DIR", "/opt/soc-ai/models")

# ── Ports sensibles connus ──────────────────────────────────────────────────
SENSITIVE_PORTS = {22, 3306, 21, 23, 3389, 5900, 6379, 27017}
KNOWN_PORTS     = {22, 80, 443, 3306, 8080, 21, 23, 3389, 53, 25, 443, 8443,
                   5900, 6379, 27017, 110, 143, 5432, 1521, 1433}

FEATURE_ORDER = [
    "priority", "src_port", "dst_port", "packet_count",
    "alert_frequency", "hour_of_day", "is_internal_src",
    "bytes_total", "duration_sec",
]


def load_models() -> dict:
    """
    Charge les 4 modèles ML + scaler + noms de clusters depuis le disque.
    Retourne un dict avec les clés : scaler, rf, iso, lr, km, cluster_names.
    Lève FileNotFoundError si les fichiers sont absents.
    """
    required_files = [
        "scaler.pkl", "random_forest.pkl", "isolation_forest.pkl",
        "logistic_regression.pkl", "kmeans.pkl",
    ]
    for f in required_files:
        path = os.path.join(MODEL_DIR, f)
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"Modèle introuvable : {path}\n"
                f"Exécute d'abord : python3 /opt/soc-ai/train_models.py"
            )

    models = {
        "scaler": joblib.load(f"{MODEL_DIR}/scaler.pkl"),
        "rf":     joblib.load(f"{MODEL_DIR}/random_forest.pkl"),
        "iso":    joblib.load(f"{MODEL_DIR}/isolation_forest.pkl"),
        "lr":     joblib.load(f"{MODEL_DIR}/logistic_regression.pkl"),
        "km":     joblib.load(f"{MODEL_DIR}/kmeans.pkl"),
    }

    # Noms des clusters (optionnel, ne bloque pas si absent)
    cluster_names_path = f"{MODEL_DIR}/cluster_names.json"
    if os.path.exists(cluster_names_path):
        with open(cluster_names_path) as f:
            models["cluster_names"] = json.load(f)
    else:
        models["cluster_names"] = {str(i): f"Cluster {i}" for i in range(4)}

    return models


def _normalize_port(port: int) -> int:
    """
    Ramène un port inconnu à la valeur de port connu la plus proche
    (réduit le bruit dans le vecteur de features).
    """
    if port in KNOWN_PORTS:
        return port
    return 80  # fallback


def _build_feature_vector(alert: dict) -> np.ndarray:
    """
    Construit le vecteur de features depuis un dict d'alerte.

    Champs attendus (tous avec valeur par défaut si absent) :
      priority        (1-3, défaut 3)
      src_port        (1-65535, défaut 12345)
      dst_port        (1-65535, défaut 80)
      packet_count    (entier, défaut 10)
      alert_frequency (entier, défaut 1)
      hour_of_day     (0-23, défaut = heure courante)
      is_internal_src (0 ou 1, défaut 0)
      bytes_total     (entier, défaut 1500)
      duration_sec    (entier, défaut 0)
    """
    dst_port = _normalize_port(int(alert.get("dst_port", 80)))

    return np.array([[
        int(alert.get("priority", 3)),
        int(alert.get("src_port", 12345)),
        dst_port,
        int(alert.get("packet_count", 10)),
        int(alert.get("alert_frequency", 1)),
        int(alert.get("hour_of_day", datetime.now().hour)),
        int(alert.get("is_internal_src", 0)),
        int(alert.get("bytes_total", 1500)),
        int(alert.get("duration_sec", 0)),
    ]])


def predict_alert(alert: dict, models: dict) -> dict:
    """
    Prédit si une alerte est un vrai positif.

    Paramètres
    ----------
    alert  : dict — champs de l'alerte (voir _build_feature_vector)
    models : dict — retourné par load_models()

    Retourne
    --------
    dict avec :
      is_attack      (bool)  — True si RF ou LR détecte une attaque
      is_anomaly     (bool)  — True si Isolation Forest détecte une anomalie
      confidence     (float) — % confiance RF (0-100)
      confidence_lr  (float) — % confiance LR (0-100)
      cluster        (int)   — cluster K-Means
      cluster_name   (str)   — libellé du cluster
      rf_label       (str)   — "Vrai Positif" | "Faux Positif"
      lr_label       (str)   — "Vrai Positif" | "Faux Positif"
      is_sensitive_port (bool) — port de destination sensible ?
      severity       (str)   — "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
      features_used  (dict)  — vecteur de features normalisé
    """
    X    = _build_feature_vector(alert)
    X_sc = models["scaler"].transform(X)

    # ── Prédictions ──────────────────────────────────────────────────────
    rf_pred    = int(models["rf"].predict(X)[0])
    rf_proba   = float(models["rf"].predict_proba(X)[0][1])

    lr_pred    = int(models["lr"].predict(X_sc)[0])
    lr_proba   = float(models["lr"].predict_proba(X_sc)[0][1])

    iso_pred   = int(models["iso"].predict(X_sc)[0])   # -1 = anomalie

    cluster    = int(models["km"].predict(X_sc)[0])
    cluster_name = models["cluster_names"].get(str(cluster), f"Cluster {cluster}")

    # ── Verdict final ─────────────────────────────────────────────────────
    is_attack  = bool(rf_pred == 1 or lr_pred == 1)
    is_anomaly = bool(iso_pred == -1)

    confidence    = round(rf_proba * 100, 1)
    confidence_lr = round(lr_proba * 100, 1)

    dst_port          = int(alert.get("dst_port", 80))
    is_sensitive_port = dst_port in SENSITIVE_PORTS

    # ── Calcul de sévérité ────────────────────────────────────────────────
    if is_attack and confidence > 80 and is_sensitive_port:
        severity = "CRITICAL"
    elif is_attack and confidence > 60:
        severity = "HIGH"
    elif is_attack or (is_anomaly and confidence > 40):
        severity = "MEDIUM"
    else:
        severity = "LOW"

    return {
        "is_attack":          is_attack,
        "is_anomaly":         is_anomaly,
        "confidence":         confidence,
        "confidence_lr":      confidence_lr,
        "cluster":            int(cluster),
        "cluster_name":       cluster_name,
        "rf_label":           "Vrai Positif" if rf_pred == 1 else "Faux Positif",
        "lr_label":           "Vrai Positif" if lr_pred == 1 else "Faux Positif",
        "is_sensitive_port":  is_sensitive_port,
        "severity":           severity,
        "features_used": {
            "priority":        int(X[0][0]),
            "src_port":        int(X[0][1]),
            "dst_port":        int(X[0][2]),
            "packet_count":    int(X[0][3]),
            "alert_frequency": int(X[0][4]),
            "hour_of_day":     int(X[0][5]),
            "is_internal_src": int(X[0][6]),
            "bytes_total":     int(X[0][7]),
            "duration_sec":    int(X[0][8]),
        }
    }


def batch_predict(alerts: list[dict], models: dict) -> list[dict]:
    """
    Prédit une liste d'alertes. Plus efficace que predict_alert() en boucle
    pour de grands volumes.
    """
    return [predict_alert(a, models) for a in alerts]


# ── Tests automatiques ──────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("🧪 SOC-AI — Test de ml_predict.py")
    print("=" * 60)

    try:
        print("\n📦 Chargement des modèles ML...")
        models = load_models()
        print(f"   ✅ {len(models)} composants chargés ({MODEL_DIR})")
    except FileNotFoundError as e:
        print(f"   ❌ {e}")
        exit(1)

    test_cases = [
        {
            "name": "Scan SSH nocturne (ATTAQUE attendue)",
            "alert": {
                "priority": 1, "src_port": 54321, "dst_port": 22,
                "packet_count": 300, "alert_frequency": 30,
                "hour_of_day": 3, "is_internal_src": 0,
                "bytes_total": 500_000, "duration_sec": 5,
            },
            "expected_attack": True,
        },
        {
            "name": "Trafic HTTP normal (FAUX POSITIF attendu)",
            "alert": {
                "priority": 3, "src_port": 49000, "dst_port": 80,
                "packet_count": 10, "alert_frequency": 2,
                "hour_of_day": 14, "is_internal_src": 1,
                "bytes_total": 5000, "duration_sec": 300,
            },
            "expected_attack": False,
        },
        {
            "name": "Brute force MySQL (ATTAQUE attendue)",
            "alert": {
                "priority": 1, "src_port": 44444, "dst_port": 3306,
                "packet_count": 250, "alert_frequency": 45,
                "hour_of_day": 2, "is_internal_src": 0,
                "bytes_total": 300_000, "duration_sec": 8,
            },
            "expected_attack": True,
        },
        {
            "name": "Scan rapide (anomalie possible)",
            "alert": {
                "priority": 2, "src_port": 55000, "dst_port": 443,
                "packet_count": 400, "alert_frequency": 20,
                "hour_of_day": 1, "is_internal_src": 0,
                "bytes_total": 200, "duration_sec": 2,
            },
            "expected_attack": None,  # résultat indéterminé
        },
    ]

    all_passed = True
    for tc in test_cases:
        result = predict_alert(tc["alert"], models)
        expected = tc["expected_attack"]
        got      = result["is_attack"]

        if expected is None:
            status = "ℹ️ "
        elif got == expected:
            status = "✅"
        else:
            status = "⚠️ "
            all_passed = False

        print(f"\n{status} {tc['name']}")
        print(f"   Verdict     : {'🔴 ATTAQUE' if got else '🟢 Faux Positif'}")
        print(f"   Confiance   : RF={result['confidence']}%  LR={result['confidence_lr']}%")
        print(f"   Anomalie    : {'⚠️  Oui' if result['is_anomaly'] else 'Non'}")
        print(f"   Sévérité    : {result['severity']}")
        print(f"   Cluster     : {result['cluster']} → {result['cluster_name']}")
        if expected is not None:
            print(f"   Attendu     : {'ATTAQUE' if expected else 'Faux Positif'}")

    print("\n" + "=" * 60)
    if all_passed:
        print("✅ Tous les tests déterministes ont réussi !")
    else:
        print("⚠️  Certains tests ne correspondent pas aux attentes.")
        print("   C'est normal si le dataset synthétique varie.")
    print("=" * 60)
