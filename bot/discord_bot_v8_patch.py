import os
import sys

BOT_PATH = "/opt/soc-ai/discord_bot.py"

def patch_bot():
    if not os.path.exists(BOT_PATH):
        print(f"Error: {BOT_PATH} not found.")
        sys.exit(1)

    with open(BOT_PATH, "r") as f:
        content = f.read()

    # 1. Replace sent_alerts = set() with last_alert_per_ip
    if "sent_alerts = set()" in content:
        content = content.replace("sent_alerts = set()", "last_alert_per_ip = {}\nALERT_COOLDOWN = 60")
    
    # 2. Fix deduplication logic in get_new_alerts
    # It used to be:
    # if alert_id in sent_alerts:
    #     continue
    # sent_alerts.add(alert_id)
    
    old_dedup = """
        if alert_id in sent_alerts:
            continue
        sent_alerts.add(alert_id)
"""
    new_dedup = """
        src_ip = record.values.get('src_ip', '')
        now = datetime.now(timezone.utc).timestamp()
        if src_ip in last_alert_per_ip and (now - last_alert_per_ip.get(src_ip, 0)) < ALERT_COOLDOWN:
            continue
        last_alert_per_ip[src_ip] = now
"""
    if "if alert_id in sent_alerts:" in content:
        # Find the indentation
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if "if alert_id in sent_alerts:" in line:
                indent = line[:len(line) - len(line.lstrip())]
                # Replace these 3 lines
                lines[i] = indent + "src_ip = record.values.get('src_ip', '')"
                lines[i+1] = indent + "now = datetime.now(timezone.utc).timestamp()"
                lines[i+2] = indent + "if src_ip in last_alert_per_ip and (now - last_alert_per_ip.get(src_ip, 0)) < ALERT_COOLDOWN:"
                lines.insert(i+3, indent + "    continue")
                lines.insert(i+4, indent + "last_alert_per_ip[src_ip] = now")
                
                # Try to remove sent_alerts.add(alert_id) if it was around here
                for j in range(i+5, i+10):
                    if j < len(lines) and "sent_alerts.add(alert_id)" in lines[j]:
                        lines[j] = ""
                break
        content = "\n".join(lines)

    # 3. Add ML predict call in monitor_alerts before embed
    # Look for: embed = discord.Embed(
    ml_call = """
        import subprocess
        ml_score = "N/A"
        try:
            result = subprocess.run(
                ['python3', '/opt/soc-ai/ml_predict.py', '--ip', str(a.get('src_ip', '')), '--sig', str(a.get('message', ''))],
                capture_output=True, text=True, timeout=5
            )
            ml_score = result.stdout.strip()
        except Exception as e:
            print("ML Predict error:", e)
"""
    if "import subprocess" not in content and "embed = discord.Embed" in content:
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if "embed = discord.Embed" in line:
                indent = line[:len(line) - len(line.lstrip())]
                lines.insert(i, ml_call.replace('\n', '\n' + indent).strip('\n'))
                break
        content = "\n".join(lines)

    # 4. Add the ML Score field to the embed
    if "ML Score" not in content and "embed.add_field" in content:
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if "embed.add_field(name=\"Priorité\"" in line:
                indent = line[:len(line) - len(line.lstrip())]
                lines.insert(i+1, indent + "embed.add_field(name=\"🤖 ML Score\", value=ml_score, inline=True)")
                break
        content = "\n".join(lines)

    with open(BOT_PATH, "w") as f:
        f.write(content)
    print(f"Successfully patched {BOT_PATH}")

def create_systemd_service():
    service_content = """[Unit]
Description=SOC Discord Bot
After=network.target suricata-influx.service

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /opt/soc-ai/discord_bot.py
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
"""
    try:
        with open("/etc/systemd/system/soc-discord-bot.service", "w") as f:
            f.write(service_content)
        os.system("systemctl daemon-reload")
        os.system("systemctl enable soc-discord-bot")
        os.system("systemctl start soc-discord-bot")
        print("Created and started soc-discord-bot.service")
    except Exception as e:
        print("Failed to create systemd service (are you root?). Error:", e)

def purge_influx():
    cmd = """curl -s -X POST "http://localhost:8086/api/v2/delete?org=SOC-PFA-YAOE&bucket=suricata_alerts" -H "Authorization: Token UUWWy5LH1U7dxO628plHnSke5LomQXCZn6AAwkW0tI_a4t69wxfig7bgPuPnlZpWLNQjDDYAqBiB900pzkstQQ==" -H "Content-Type: application/json" -d '{"start":"2026-01-01T00:00:00Z","stop":"2026-12-31T00:00:00Z","predicate":"classification=\\"Test\\""}'"""
    print("Purging InfluxDB 'Test' alerts...")
    os.system(cmd)
    print("\nPurge command executed.")

if __name__ == "__main__":
    patch_bot()
    create_systemd_service()
    purge_influx()
    print("All Priority 1-3 & 5 automated tasks on SOC-Center completed.")
