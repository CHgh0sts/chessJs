// Utilitaires de debug pour Socket.IO
export function getSocketDebugInfo() {
  const info = {
    nodeEnv: process.env.NODE_ENV,
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL,
    currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'server-side',
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server-side',
    protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown',
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    port: typeof window !== 'undefined' ? window.location.port : 'unknown',
  };
  
  console.log('🔍 Debug Socket.IO:', info);
  return info;
}

export function testSocketConnection(url: string) {
  return new Promise((resolve, reject) => {
    const testSocket = new WebSocket(url.replace('http', 'ws') + '/socket.io/?EIO=4&transport=websocket');
    
    testSocket.onopen = () => {
      console.log('✅ Test WebSocket réussi');
      testSocket.close();
      resolve(true);
    };
    
    testSocket.onerror = (error) => {
      console.error('❌ Test WebSocket échoué:', error);
      reject(error);
    };
    
    // Timeout après 5 secondes
    setTimeout(() => {
      testSocket.close();
      reject(new Error('Timeout'));
    }, 5000);
  });
}
