#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# apply_ml_patch.sh — Applique automatiquement le patch ML sur discord_bot.py
# Usage : bash /opt/soc-ai/apply_ml_patch.sh
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

BOT_FILE="/opt/soc-ai/discord_bot.py"
BACKUP="${BOT_FILE}.bak_$(date +%Y%m%d_%H%M%S)"

echo "╔══════════════════════════════════════════════╗"
echo "║  🧠 Patch ML — discord_bot.py                ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Vérifications préalables ──────────────────────────────────────────────
if [ ! -f "$BOT_FILE" ]; then
    echo "❌ Fichier non trouvé : $BOT_FILE"
    exit 1
fi

if [ ! -f "/opt/soc-ai/models/random_forest.pkl" ]; then
    echo "⚠️  Modèles ML non trouvés. Lancement de l'entraînement..."
    python3 /opt/soc-ai/generate_dataset.py
    python3 /opt/soc-ai/train_models.py
    echo "✅ Modèles entraînés"
fi

# ── Backup ────────────────────────────────────────────────────────────────
cp "$BOT_FILE" "$BACKUP"
echo "✅ Backup créé : $BACKUP"

# ── Test : patch déjà appliqué ? ──────────────────────────────────────────
if grep -q "from ml_predict import" "$BOT_FILE"; then
    echo "⚠️  Patch ML déjà présent dans discord_bot.py"
    echo "   Supprime les lignes existantes ou utilise le backup si nécessaire."
    exit 0
fi

# ── PATCH_01 : Import ML (après le bloc d'imports) ────────────────────────
echo ""
echo "🔧 Application PATCH_01 (imports ML)..."

# Chercher la dernière ligne d'import et insérer après
IMPORT_LINE=$(grep -n "^import\|^from" "$BOT_FILE" | tail -1 | cut -d: -f1)

if [ -z "$IMPORT_LINE" ]; then
    echo "⚠️  Impossible de localiser les imports. Ajout en tête de fichier."
    IMPORT_LINE=1
fi

# Insérer le bloc ML après la dernière ligne d'import
python3 - <<'PYEOF'
import re

bot_file = "/opt/soc-ai/discord_bot.py"
with open(bot_file, "r") as f:
    content = f.read()

ML_IMPORT_BLOCK = '''
# ── Import ML (auto-patched) ─────────────────────────────────────────────────
import sys as _sys
_sys.path.insert(0, '/opt/soc-ai')
try:
    from ml_predict import load_models as _load_models, predict_alert as ml_predict_alert
    ML_AVAILABLE = True
except ImportError as _e:
    logger.warning(f"⚠️  ml_predict non trouvé : {_e}") if 'logger' in dir() else None
    ML_AVAILABLE = False

ML_MODELS = None
if ML_AVAILABLE:
    try:
        ML_MODELS = _load_models()
        logger.info("✅ Modèles ML chargés") if 'logger' in dir() else print("✅ ML chargé")
    except Exception as _e:
        logger.warning(f"⚠️  ML indisponible : {_e}") if 'logger' in dir() else None
# ──────────────────────────────────────────────────────────────────────────────
'''

# Insérer après les lignes d'import (chercher le premier bloc non-import)
lines = content.split('\n')
last_import_idx = 0
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith('import ') or stripped.startswith('from '):
        last_import_idx = i

insert_pos = last_import_idx + 1
lines.insert(insert_pos, ML_IMPORT_BLOCK)

with open(bot_file, "w") as f:
    f.write('\n'.join(lines))

print(f"  Importé à la ligne {insert_pos + 1}")
PYEOF

echo "✅ PATCH_01 appliqué"

# ── PATCH_02 : Prédiction ML dans monitor_alerts ──────────────────────────
echo ""
echo "🔧 Application PATCH_02 (prédiction ML dans monitor_alerts)..."

python3 - <<'PYEOF'
bot_file = "/opt/soc-ai/discord_bot.py"
with open(bot_file, "r") as f:
    content = f.read()

search = "get_mistral_analysis"
if search in content:
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if search in line and 'def ' not in line:
            # Match the exact indentation of the matched line
            indent = line[:len(line) - len(line.lstrip())]
            ml_block = f"""
{indent}# ── Prédiction ML (auto-patched) ──────────────────────────────
{indent}ml_result = None
{indent}if ML_MODELS:
{indent}    try:
{indent}        from datetime import datetime as _dt
{indent}        src_ip = str(a.get("src_ip", ""))
{indent}        _ml_input = {{
{indent}            "priority":        a.get("priority", 3),
{indent}            "src_port":        int(a.get("src_port", 12345)),
{indent}            "dst_port":        int(a.get("dst_port", 80)),
{indent}            "packet_count":    int(a.get("packet_count", 50)),
{indent}            "alert_frequency": int(a.get("alert_frequency", 5)),
{indent}            "hour_of_day":     _dt.now().hour,
{indent}            "is_internal_src": 1 if any(src_ip.startswith(p) for p in ["192.168","10.","172.16"]) else 0,
{indent}            "bytes_total":     int(a.get("bytes_total", 1500)),
{indent}            "duration_sec":    int(a.get("duration_sec", 0)),
{indent}        }}
{indent}        ml_result = ml_predict_alert(_ml_input, ML_MODELS)
{indent}    except Exception as _e:
{indent}        logger.error(f"ML predict error: {{_e}}")
{indent}# ──────────────────────────────────────────────────────────────"""
            lines.insert(i + 1, ml_block)
            break
    content = '\n'.join(lines)

    with open(bot_file, "w") as f:
        f.write(content)
    print("  Injecté après get_mistral_analysis")
else:
    print(f"  ⚠️  Pattern '{search}' non trouvé — patch manuel requis")
PYEOF

echo "✅ PATCH_02 appliqué"

# ── PATCH_03 : Champ ML dans l'embed ──────────────────────────────────────
echo ""
echo "🔧 Application PATCH_03 (champ ML embed Discord)..."

python3 - <<'PYEOF'
bot_file = "/opt/soc-ai/discord_bot.py"
with open(bot_file, "r") as f:
    content = f.read()

# Modifier la signature de build_alert_embed si elle n'a pas ml_result
if "def build_alert_embed" in content and "ml_result=None" not in content:
    content = content.replace(
        "def build_alert_embed(",
        "def build_alert_embed(",  # on va chercher plus précisément
    )
    import re
    content = re.sub(
        r'(def build_alert_embed\([^)]*)\)',
        r'\1, ml_result=None)',
        content,
        count=1
    )
    print("  Signature mise à jour")

# Insérer le champ ML avant return embed
if "return embed" in content and "Analyse ML" not in content:
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if "return embed" in line:
            indent = line[:len(line) - len(line.lstrip())]
            ml_embed_block = f"""
{indent}# ── Champ ML (auto-patched) ──────────────────────────────────────────────
{indent}if ml_result:
{indent}    _sev_emoji = {{"CRITICAL":"🔴","HIGH":"🟠","MEDIUM":"🟡","LOW":"🟢"}}.get(ml_result.get("severity","MEDIUM"),"🟡")
{indent}    _verdict   = "🔴 ATTAQUE" if ml_result["is_attack"] else "🟢 Faux Positif"
{indent}    _anomaly   = "⚠️ Détectée" if ml_result["is_anomaly"] else "✅ Normal"
{indent}    _ml_text   = (
{indent}        f"**Verdict :** {{_verdict}}\\n"
{indent}        f"**Confiance RF :** {{ml_result['confidence']}}% | LR : {{ml_result.get('confidence_lr','?')}}%\\n"
{indent}        f"**Anomalie :** {{_anomaly}} | **Sévérité :** {{_sev_emoji}} {{ml_result.get('severity','N/A')}}\\n"
{indent}        f"**Cluster :** {{ml_result['cluster']}} → {{ml_result.get('cluster_name','?')}}"
{indent}    )
{indent}    embed.add_field(name="🧠 Analyse ML", value=_ml_text, inline=False)
{indent}# ─────────────────────────────────────────────────────────────────────────"""
            lines.insert(i, ml_embed_block)
            break
    content = '\n'.join(lines)
    print("  Champ ML ajouté avant return embed")

with open(bot_file, "w") as f:
    f.write(content)
PYEOF

echo "✅ PATCH_03 appliqué"

# ── Validation syntaxique ─────────────────────────────────────────────────
echo ""
echo "🔍 Validation syntaxique Python..."
if python3 -m py_compile "$BOT_FILE" 2>&1; then
    echo "✅ Syntaxe valide"
else
    echo "❌ Erreur de syntaxe ! Restauration du backup..."
    cp "$BACKUP" "$BOT_FILE"
    echo "   Backup restauré. Patch manuel requis."
    exit 1
fi

# ── Redémarrer le service ─────────────────────────────────────────────────
echo ""
echo "🔄 Redémarrage du service discord-bot..."
if systemctl is-active --quiet discord-bot; then
    systemctl restart discord-bot
    sleep 2
    if systemctl is-active --quiet discord-bot; then
        echo "✅ Service discord-bot actif"
    else
        echo "❌ Le service ne redémarre pas. Vérifier les logs :"
        journalctl -u discord-bot -n 30 --no-pager
    fi
else
    echo "⚠️  Service discord-bot non trouvé. Démarrage manuel :"
    echo "   python3 /opt/soc-ai/discord_bot.py"
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ Patch ML appliqué avec succès !           ║"
echo "║                                              ║"
echo "║  Vérifier dans Discord :                     ║"
echo "║  → Lancer un scan depuis Kali-Red            ║"
echo "║  → L'embed doit avoir un champ               ║"
echo "║    '🧠 Analyse ML'                            ║"
echo "╚══════════════════════════════════════════════╝"
