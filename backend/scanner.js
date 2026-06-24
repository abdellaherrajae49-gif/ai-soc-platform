const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const util = require('util');

const execAsync = util.promisify(exec);

const TOOLS_DIR = path.join(__dirname, 'tools');
const APKTOOL_JAR = path.join(TOOLS_DIR, 'apktool.jar');
const JADX_BIN = path.join(TOOLS_DIR, 'jadx', 'bin', 'jadx.bat');

async function analyzeAPK(apkPath, originalName) {
  const scanId = crypto.randomBytes(8).toString('hex');
  const outDir = path.join(__dirname, 'scans', scanId);
  const apktoolOut = path.join(outDir, 'apktool');
  const jadxOut = path.join(outDir, 'jadx');

  const results = [];
  let analysisArtifactsRead = 0;
  let staticToolSucceeded = false;
  
  try {
    await fs.mkdir(outDir, { recursive: true });

    // 1. Run Apktool
    try {
      console.log(`[VulnScan] Running apktool on ${originalName}...`);
      await execAsync(`java -jar "${APKTOOL_JAR}" d -f -o "${apktoolOut}" "${apkPath}"`);
      staticToolSucceeded = true;
    } catch (e) {
      console.error(`[VulnScan] Apktool error:`, e.message);
    }

    // 2. Run Jadx
    try {
      console.log(`[VulnScan] Running jadx on ${originalName}...`);
      await execAsync(`"${JADX_BIN}" -d "${jadxOut}" "${apkPath}"`);
      staticToolSucceeded = true;
    } catch (e) {
      console.error(`[VulnScan] Jadx error:`, e.message);
    }

    // 3. Analyze AndroidManifest.xml
    const manifestPath = path.join(apktoolOut, 'AndroidManifest.xml');
    try {
      const manifestStr = await fs.readFile(manifestPath, 'utf8');
      analysisArtifactsRead += 1;
      
      if (manifestStr.includes('android:exported="true"')) {
        results.push({
          id: crypto.randomBytes(4).toString('hex'),
          name: 'Exported Component',
          severity: 'MEDIUM',
          cve: 'CWE-926',
          type: 'static',
          description: 'Composant exporté détecté dans le Manifest.',
          detail: 'Analyse statique (SAST) : AndroidManifest.xml contient des composants avec android:exported="true" sans restriction d\'intent.',
          simpleExplain: 'Un composant de l\'application peut être lancé par n\'importe quelle autre application sur le téléphone.'
        });
      }

      if (manifestStr.includes('android:usesCleartextTraffic="true"')) {
        results.push({
          id: crypto.randomBytes(4).toString('hex'),
          name: 'Cleartext Traffic Enabled',
          severity: 'HIGH',
          cve: 'CWE-319',
          type: 'static',
          description: 'Le trafic réseau en clair est autorisé.',
          detail: 'Analyse statique (SAST) : AndroidManifest.xml contient android:usesCleartextTraffic="true". Les données peuvent transiter sans chiffrement HTTPS.',
          simpleExplain: 'L\'application autorise l\'envoi de données non sécurisées sur le réseau, comme envoyer une carte postale.'
        });
      }
    } catch (e) {
      console.log('[VulnScan] Manifest non trouvé ou illisible.');
    }

    // 4. Analyze strings.xml for hardcoded secrets
    const stringsPath = path.join(apktoolOut, 'res', 'values', 'strings.xml');
    try {
      const stringsStr = await fs.readFile(stringsPath, 'utf8');
      analysisArtifactsRead += 1;
      if (stringsStr.match(/api_key|password|secret|token|credentials/i)) {
         results.push({
          id: crypto.randomBytes(4).toString('hex'),
          name: 'Possible Hardcoded Secret',
          severity: 'CRITICAL',
          cve: 'CWE-798',
          type: 'static',
          description: 'Des mots-clés liés à des secrets détectés dans strings.xml.',
          detail: 'Analyse statique (SAST) : res/values/strings.xml contient des chaînes de caractères potentiellement sensibles (api_key, password, token...).',
          simpleExplain: 'Des mots de passe ou clés d\'accès semblent être inscrits en dur dans le code de l\'application.'
        });
      }
    } catch (e) {
      // strings.xml might not exist
    }

    if (!staticToolSucceeded || analysisArtifactsRead === 0) {
      throw new Error('Les outils d’analyse n’ont produit aucun artefact exploitable');
    }

    // 5. Basic fallback if nothing found
    if (results.length === 0) {
      results.push({
          id: crypto.randomBytes(4).toString('hex'),
          name: 'No Critical Vulnerabilities Found',
          severity: 'LOW',
          cve: 'N/A',
          type: 'static',
          description: 'Analyse de base réussie.',
          detail: `Aucune vulnérabilité flagrante n'a été trouvée dans le manifest ou strings.xml de ${originalName}.`,
          simpleExplain: 'L\'application semble relativement saine sur les points de contrôle basiques.'
      });
    }
    
    // Optional demo-only dynamic result
    if (process.env.ENABLE_FAKE_DYNAMIC_SCAN === 'true') {
    results.push({
      id: crypto.randomBytes(4).toString('hex'),
      name: 'Cleartext HTTP Traffic (Runtime)',
      severity: 'MEDIUM',
      cve: 'CWE-319',
      type: 'dynamic',
      description: 'Trafic HTTP en clair détecté à l\'exécution.',
      detail: 'Analyse dynamique (DAST) : Interception réseau a détecté des requêtes HTTP vers le port 80.',
      simpleExplain: 'Pendant l\'utilisation, l\'application a envoyé des informations non sécurisées sur internet.'
    });
    }

    // Cleanup 
    try {
      await fs.rm(outDir, { recursive: true, force: true });
      await fs.unlink(apkPath);
    } catch(e) {
       console.error('[VulnScan] Cleanup error', e);
    }

    return results;

  } catch (error) {
    console.error('[VulnScan] Analysis Error:', error);
    throw error;
  }
}

module.exports = { analyzeAPK };
