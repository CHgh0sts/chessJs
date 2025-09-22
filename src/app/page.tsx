'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useDialog } from '@/hooks/useDialog';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import Matchmaking from '@/components/game/Matchmaking';
import GameRoom from '@/components/game/GameRoom';
import Dialog from '@/components/ui/Dialog';

export default function Home() {
  const { user, loading, logout } = useAuth();
  const { gameState, leaveGame } = useSocket();
  const [showRegister, setShowRegister] = useState(false);
  const { isOpen, dialogOptions, onConfirm, showDialog, hideDialog } = useDialog();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Navigation */}
        <nav className="relative z-10 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-3xl">♔</span>
              <span className="text-2xl font-bold text-white">Chess Battle</span>
            </div>
            <div className="hidden md:flex space-x-6 text-gray-300">
              <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
              <a href="#about" className="hover:text-white transition-colors">À propos</a>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
          
          <div className="relative z-10 px-6 py-16">
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left Column - Hero Text */}
                <div className="text-center lg:text-left">
                  <h1 className="text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                    Maîtrisez les
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"> Échecs</span>
                  </h1>
                  <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                    Affrontez des joueurs du monde entier dans des parties d'échecs palpitantes. 
                    Développez votre stratégie et gravissez les classements !
                  </p>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-6 mb-8">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-400">24/7</div>
                      <div className="text-sm text-gray-400">Disponible</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400">10s</div>
                      <div className="text-sm text-gray-400">Matchmaking</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-400">∞</div>
                      <div className="text-sm text-gray-400">Parties</div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Auth Form */}
                <div className="flex justify-center">
                  <div className="w-full max-w-md">
                    <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white mb-2">
                          {showRegister ? 'Créer un compte' : 'Se connecter'}
                        </h2>
                        <p className="text-gray-400">
                          {showRegister ? 'Rejoignez la communauté' : 'Bon retour parmi nous !'}
                        </p>
                      </div>

                      {showRegister ? (
                        <RegisterForm 
                          onSuccess={() => setShowRegister(false)}
                          onSwitchToLogin={() => setShowRegister(false)}
                        />
                      ) : (
                        <LoginForm 
                          onSuccess={() => console.log('Connexion réussie')}
                          onSwitchToRegister={() => setShowRegister(true)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">
                Pourquoi choisir Chess Battle ?
              </h2>
              <p className="text-xl text-gray-400">
                Une expérience d'échecs moderne et immersive
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-8 border border-gray-700/30 hover:border-yellow-500/50 transition-all duration-300 group">
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">⚡</div>
                <h3 className="text-2xl font-bold text-white mb-4">Parties Instantanées</h3>
                <p className="text-gray-400 leading-relaxed">
                  Matchmaking ultra-rapide avec des joueurs de votre niveau. Trouvez un adversaire en moins de 10 secondes !
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-8 border border-gray-700/30 hover:border-blue-500/50 transition-all duration-300 group">
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">⏱️</div>
                <h3 className="text-2xl font-bold text-white mb-4">Timer Avancé</h3>
                <p className="text-gray-400 leading-relaxed">
                  Système de chronométrage précis avec alertes visuelles. Maîtrisez la gestion du temps !
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-8 border border-gray-700/30 hover:border-green-500/50 transition-all duration-300 group">
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">🏆</div>
                <h3 className="text-2xl font-bold text-white mb-4">Classement ELO</h3>
                <p className="text-gray-400 leading-relaxed">
                  Système de rating professionnel pour suivre votre progression et vous mesurer aux meilleurs.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-8 border border-gray-700/30 hover:border-purple-500/50 transition-all duration-300 group">
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">🎯</div>
                <h3 className="text-2xl font-bold text-white mb-4">Interface Intuitive</h3>
                <p className="text-gray-400 leading-relaxed">
                  Design moderne et épuré pour une expérience de jeu optimale. Concentrez-vous sur l'essentiel !
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-8 border border-gray-700/30 hover:border-red-500/50 transition-all duration-300 group">
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">🔥</div>
                <h3 className="text-2xl font-bold text-white mb-4">Temps Réel</h3>
                <p className="text-gray-400 leading-relaxed">
                  Synchronisation parfaite entre les joueurs. Chaque mouvement est instantané !
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-8 border border-gray-700/30 hover:border-orange-500/50 transition-all duration-300 group">
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">🌍</div>
                <h3 className="text-2xl font-bold text-white mb-4">Communauté Globale</h3>
                <p className="text-gray-400 leading-relaxed">
                  Rejoignez des milliers de joueurs passionnés du monde entier. L'aventure vous attend !
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-2xl p-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                Prêt à relever le défi ?
              </h2>
              <p className="text-xl text-yellow-100 mb-8">
                Rejoignez Chess Battle dès maintenant et commencez votre ascension vers le sommet !
              </p>
              <button
                onClick={() => setShowRegister(true)}
                className="bg-white text-orange-600 font-bold py-4 px-8 rounded-xl text-lg hover:bg-gray-100 transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Commencer maintenant
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">♔ Chess Battle</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Bonjour, {user.username}</span>
              {gameState && (
                <button
                  onClick={() => {
                    showDialog({
                      title: 'Quitter la partie',
                      message: 'Êtes-vous sûr de vouloir quitter la partie en cours ? Vous retournerez au menu principal.',
                      confirmText: 'Quitter',
                      cancelText: 'Rester',
                      type: 'warning'
                    }, () => {
                      leaveGame();
                    });
                  }}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  🏠 Menu principal
                </button>
              )}
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="container mx-auto px-4 py-8">
        {gameState ? <GameRoom /> : <Matchmaking />}
      </main>

      {/* Dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={hideDialog}
        title={dialogOptions.title}
        message={dialogOptions.message}
        confirmText={dialogOptions.confirmText}
        cancelText={dialogOptions.cancelText}
        type={dialogOptions.type}
        onConfirm={onConfirm}
      />
    </div>
  );
}