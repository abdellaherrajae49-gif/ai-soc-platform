export interface Course {
  id: string;
  title: string;
  description: string;
  howItWorks: string;
  motivation: string;
  quizPrompt: string;
}

export const COURSES: Record<string, Course> = {
  'ARP Spoofing': {
    id: 'ARP Spoofing',
    title: 'L\'Usurpation ARP (ARP Spoofing)',
    description: "Imaginez que vous êtes dans un bureau et que quelqu'un crie : 'Qui est le directeur ?' Quelqu'un d'autre ment et répond : 'C'est moi !'. À partir de ce moment, tous les documents confidentiels destinés au directeur sont remis au menteur. C'est exactement ce que fait l'ARP Spoofing sur un réseau.",
    howItWorks: "Un pirate envoie de faux messages sur le réseau local pour associer son propre ordinateur à l'adresse (IP) d'un autre appareil (souvent le routeur ou la box internet). L'ordinateur de la victime va alors envoyer tout son trafic internet au pirate sans s'en rendre compte.",
    motivation: "Pourquoi s'en soucier ? Si un attaquant réussit cette attaque (très courante sur les Wi-Fi publics), il peut intercepter vos mots de passe, vos messages, et espionner vos employés. Protéger votre réseau avec des solutions de détection est essentiel.",
    quizPrompt: "Salut Mistral ! Fais-moi un quiz rapide (3 questions à choix multiples) pour vérifier si j'ai bien compris l'ARP Spoofing."
  },
  'MITM': {
    id: 'MITM',
    title: 'L\'Attaque de l\'Homme du Milieu (Man in the Middle)',
    description: "C'est comme un facteur malveillant qui ouvre vos lettres, les lit, les modifie parfois, puis les recachette avant de les livrer au destinataire. Ni vous, ni le destinataire ne savez que la lettre a été lue.",
    howItWorks: "L'attaquant s'insère secrètement entre deux parties (par exemple, vous et le site web de votre banque). Il relaie les messages entre les deux, ce qui lui permet de tout lire. Il utilise souvent des réseaux Wi-Fi non sécurisés ou de faux certificats de sécurité.",
    motivation: "Les conséquences peuvent être désastreuses : vol de coordonnées bancaires, de mots de passe, ou encore modification de contrats en temps réel. C'est pour cela que l'utilisation du HTTPS et de VPN est primordiale pour la sécurité de vos clients.",
    quizPrompt: "Mistral, peux-tu me faire un quiz interactif (avec 2 ou 3 questions) sur les attaques Man in the Middle ?"
  },
  'Cross-Site Scripting (XSS)': {
    id: 'Cross-Site Scripting (XSS)',
    title: 'L\'Injection de Code (XSS)',
    description: "Imaginez qu'un délinquant glisse un tract piégé dans un journal très réputé. Quand vous lisez le journal en toute confiance, le piège se déclenche. Le XSS fonctionne de la même manière, mais sur des sites web légitimes.",
    howItWorks: "L'attaquant trouve une faille sur un site web (comme une zone de commentaires) et y cache du code invisible. Quand un autre visiteur consulte cette page, son propre navigateur web exécute ce code à son insu.",
    motivation: "Une attaque XSS permet de voler la 'session' (le fait d'être connecté) d'un utilisateur. Un pirate pourrait ainsi prendre le contrôle du compte de vos clients sur votre plateforme. C'est l'une des failles web les plus courantes et dangereuses.",
    quizPrompt: "Peux-tu me tester sur mes connaissances de la faille XSS (Cross-Site Scripting) avec un quiz ?"
  },
  'SQL Injection (SQLi)': {
    id: 'SQL Injection (SQLi)',
    title: 'L\'Injection SQL',
    description: "Imaginez que vous donnez un ordre à un robot : 'Apporte-moi le dossier de Monsieur Dupont'. Quelqu'un s'approche et ajoute discrètement : '...et ensuite, détruis tous les autres dossiers !'. Le robot obéit sans réfléchir.",
    howItWorks: "L'injection SQL se produit lorsqu'un site web demande des informations (comme un nom d'utilisateur) et qu'un pirate tape une commande de base de données à la place. Si le site est mal protégé, il va exécuter cette commande directement sur la base de données.",
    motivation: "C'est le pire cauchemar d'une entreprise : l'attaquant peut voler toute la base de données (mots de passe, emails, données bancaires de tous les clients) ou tout effacer en un instant. Une programmation rigoureuse est obligatoire pour l'éviter.",
    quizPrompt: "Teste-moi avec un quiz à choix multiples sur l'injection SQL."
  },
  'Insecure Data Storage': {
    id: 'Insecure Data Storage',
    title: 'Stockage de Données Non Sécurisé',
    description: "C'est comme cacher la clé d'un coffre-fort sous le paillasson avec une étiquette 'clé du coffre'. Même si la maison est verrouillée, la clé est facilement trouvable.",
    howItWorks: "Beaucoup d'applications mobiles sauvegardent des informations sensibles (mots de passe, jetons de connexion, informations personnelles) directement dans la mémoire du téléphone, sans chiffrement. Un téléphone volé ou infecté permet de récupérer ces données facilement.",
    motivation: "Un téléphone est facilement perdu ou volé. Si votre application stocke les données des clients sans les chiffrer, c'est toute leur vie privée qui est compromise. Cela nuit gravement à la réputation de votre marque.",
    quizPrompt: "Fais-moi un quiz sur le stockage de données non sécurisé sur les applications mobiles."
  }
};

// Default fallback course for missing ones
export const DEFAULT_COURSE: Course = {
  id: 'default',
  title: 'Concept de Cybersécurité',
  description: "Ce concept représente une menace ou une faille potentielle pour le système d'information.",
  howItWorks: "En exploitant une faiblesse dans la configuration, le code, ou le comportement humain, un pirate peut s'introduire dans le système.",
  motivation: "Comprendre cette menace permet à votre entreprise d'anticiper les risques, de protéger les données de vos clients, et d'éviter des pertes financières importantes.",
  quizPrompt: "Fais-moi un quiz pour tester mes connaissances générales en cybersécurité."
};
