# ♔ Chess Battle ♛

Un jeu d'échecs en ligne en temps réel développé avec Next.js et Socket.IO.

## ✨ Fonctionnalités

- **🔐 Authentification personnalisée** : Système d'inscription et de connexion sans dépendances externes
- **⚡ Parties en temps réel** : Communication instantanée via WebSockets
- **♟️ Plateau d'échecs complet** : Toutes les règles d'échecs implémentées
- **⏱️ Timer intégré** : Décompte automatique avec temps limite (10 minutes par joueur)
- **🎯 Matchmaking automatique** : Trouvez un adversaire rapidement
- **📱 Interface responsive** : Design moderne et adaptatif
- **🏆 Système de rating** : Suivi des statistiques et du classement

## 🚀 Installation et lancement

1. **Cloner le projet** :

```bash
git clone <url-du-repo>
cd chest
```

2. **Installer les dépendances** :

```bash
npm install
```

3. **Lancer en mode développement** :

```bash
npm run dev
```

4. **Ouvrir dans le navigateur** :

```
http://localhost:3000
```

## 🎮 Comment jouer

1. **Créer un compte** ou se connecter
2. **Cliquer sur "Trouver un adversaire"** pour démarrer une partie
3. **Jouer aux échecs** :
   - Cliquer sur une pièce pour la sélectionner
   - Cliquer sur une case valide pour déplacer
   - Les mouvements possibles sont mis en surbrillance
4. **Surveiller le timer** : Vous avez 10 minutes pour jouer
5. **Gagner par** :
   - Échec et mat
   - Temps dépassé de l'adversaire
   - Abandon de l'adversaire

## 🛠️ Technologies utilisées

- **Frontend** : Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend** : Node.js avec serveur HTTP personnalisé
- **WebSockets** : Socket.IO pour la communication temps réel
- **Logique d'échecs** : chess.js
- **Authentification** : JWT + bcrypt
- **Styling** : Tailwind CSS

## 📁 Structure du projet

```
src/
├── app/                    # Pages Next.js
├── components/
│   ├── auth/             # Composants d'authentification
│   ├── chess/            # Composants de jeu d'échecs
│   └── game/             # Composants de partie
├── contexts/             # Contextes React (Auth, Socket)
├── lib/                  # Utilitaires et helpers
└── types/                # Types TypeScript
```

## 🔧 Configuration

Le projet utilise un serveur Node.js personnalisé (`server.js`) qui combine :

- Le serveur Next.js pour les pages
- Un serveur Socket.IO pour les WebSockets
- La logique de matchmaking et de gestion des parties

## 🎯 Fonctionnalités avancées

### Timer intelligent

- Décompte automatique pendant le tour de chaque joueur
- Avertissement visuel quand il reste moins de 30 secondes
- Fin de partie automatique en cas de dépassement

### Logique d'échecs complète

- Tous les mouvements valides
- Détection d'échec et mat
- Détection de partie nulle
- Gestion des coups spéciaux (roque, en passant, promotion)

### Interface utilisateur intuitive

- Plateau avec coordonnées
- Indication des mouvements possibles
- Historique visuel du dernier coup
- Interface responsive pour mobile et desktop

## 🔮 Améliorations futures

- Base de données persistante
- Historique des parties
- Spectateurs en direct
- Chat en temps réel
- Tournois
- Analyses de parties
- Différents modes de jeu (blitz, bullet, etc.)

## 📝 Licence

Ce projet est développé à des fins éducatives.
