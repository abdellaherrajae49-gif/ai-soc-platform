#!/usr/bin/env python3
"""
Patch ML pour discord_bot.py
=============================
Ce fichier montre les modifications à apporter à /opt/soc-ai/discord_bot.py
pour intégrer les prédictions ML dans les alertes Discord.

Appliquer via : bash /opt/soc-ai/apply_ml_patch.sh
Ou manuellement en suivant les commentaires PATCH_XXX ci-dessous.
"""

# ══════════════════════════════════════════════════════════════════════════════
# PATCH_01 — Ajouter après les imports existants du discord_bot.py
# ══════════════════════════════════════════════════════════════════════════════

PATCH_01_IMPORTS = """
# ── Import ML ────────────────────────────────────────────────────────────────
import sys
sys.path.insert(0, '/opt/soc-ai')
try:
    from ml_predict import load_models, predict_alert as ml_predict_alert
    ML_AVAILABLE = True
except ImportError as e:
    logger.warning(f"⚠️  ml_predict non trouvé : {e}")
    ML_AVAILABLE = False

# ── Chargement des modèles au démarrage ────────────────────────────────────
ML_MODELS = None
if ML_AVAILABLE:
    try:
        ML_MODELS = load_models()
        logger.info("✅ Modèles ML chargés (RF + IsoForest + LR + KMeans)")
    except Exception as e:
        logger.warning(f"⚠️  ML indisponible (modèles non entraînés?) : {e}")
"""

# ══════════════════════════════════════════════════════════════════════════════
# PATCH_02 — Dans monitor_alerts(), après la ligne :
#   ai_analysis = get_mistral_analysis(a) if priority <= 2 else None
# Ajouter le bloc suivant :
# ══════════════════════════════════════════════════════════════════════════════

PATCH_02_ML_PREDICT = """
            # ── Prédiction ML ─────────────────────────────────────────────
            ml_result = None
            if ML_MODELS:
                try:
                    from datetime import datetime as _dt
                    src_ip = str(a.get("src_ip", ""))
                    ml_input = {
                        "priority":        a.get("priority", 3),
                        "src_port":        int(a.get("src_port", 12345)),
                        "dst_port":        int(a.get("dst_port", 80)),
                        "packet_count":    int(a.get("packet_count", 50)),
                        "alert_frequency": int(a.get("alert_frequency", 5)),
                        "hour_of_day":     _dt.now().hour,
                        "is_internal_src": 1 if (
                            src_ip.startswith("192.168") or
                            src_ip.startswith("10.")     or
                            src_ip.startswith("172.16")
                        ) else 0,
                        "bytes_total":     int(a.get("bytes_total", 1500)),
                        "duration_sec":    int(a.get("duration_sec", 0)),
                    }
                    ml_result = ml_predict_alert(ml_input, ML_MODELS)
                    logger.debug(f"ML verdict: {ml_result['severity']} | confidence={ml_result['confidence']}%")
                except Exception as e:
                    logger.error(f"ML predict error: {e}")
"""

# ══════════════════════════════════════════════════════════════════════════════
# PATCH_03 — Dans build_alert_embed() :
#   1. Ajouter ml_result=None dans la signature de la fonction
#   2. Ajouter ce bloc AVANT le return embed
# ══════════════════════════════════════════════════════════════════════════════

PATCH_03_EMBED = """
    # ── Champ ML dans l'embed Discord ─────────────────────────────────────
    if ml_result:
        severity_emoji = {
            "CRITICAL": "🔴",
            "HIGH":     "🟠",
            "MEDIUM":   "🟡",
            "LOW":      "🟢",
        }.get(ml_result.get("severity", "MEDIUM"), "🟡")

        verdict    = "🔴 ATTAQUE"    if ml_result["is_attack"]  else "🟢 Faux Positif"
        anomaly    = "⚠️ Détectée"   if ml_result["is_anomaly"] else "✅ Normal"
        port_flag  = "🔑 Sensible"   if ml_result.get("is_sensitive_port") else "Normal"

        ml_text = (
            f"**Verdict RF/LR :** {verdict}\\n"
            f"**Confiance RF  :** {ml_result['confidence']}%  |  "
            f"**LR :** {ml_result.get('confidence_lr', '?')}%\\n"
            f"**Anomalie      :** {anomaly}\\n"
            f"**Sévérité ML   :** {severity_emoji} {ml_result.get('severity', 'N/A')}\\n"
            f"**Cluster       :** {ml_result['cluster']} → {ml_result.get('cluster_name', '?')}\\n"
            f"**Port cible    :** {port_flag}"
        )
        embed.add_field(name="🧠 Analyse ML (Scikit-learn)", value=ml_text, inline=False)
"""

# ══════════════════════════════════════════════════════════════════════════════
# PATCH_04 — Dans l'appel à build_alert_embed(), passer ml_result :
#   Avant  : embed = build_alert_embed(a, ai_analysis)
#   Après  : embed = build_alert_embed(a, ai_analysis, ml_result=ml_result)
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("📋 Guide de patch ML pour discord_bot.py")
    print("=" * 60)
    print()
    print("PATCH_01 — Ajouter après les imports :")
    print(PATCH_01_IMPORTS)
    print()
    print("PATCH_02 — Dans monitor_alerts(), après get_mistral_analysis :")
    print(PATCH_02_ML_PREDICT)
    print()
    print("PATCH_03 — Dans build_alert_embed(), avant return embed :")
    print(PATCH_03_EMBED)
    print()
    print("PATCH_04 — Modifier l'appel build_alert_embed() :")
    print("  Avant  : embed = build_alert_embed(a, ai_analysis)")
    print("  Après  : embed = build_alert_embed(a, ai_analysis, ml_result=ml_result)")
    print()
    print("Puis redémarrer : systemctl restart discord-bot")
