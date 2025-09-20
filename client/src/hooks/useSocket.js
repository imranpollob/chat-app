import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import useAuth from './useAuth';

const useSocket = () => {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    if (!token) {
      setSocket((current) => {
        if (current) {
          current.disconnect();
        }
        return null;
      });
      setStatus('disconnected');
      return undefined;
    }

    const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ['websocket'],
      auth: { token }
    });

    setSocket(newSocket);

    const handleConnect = () => setStatus('connected');
    const handleDisconnect = () => setStatus('disconnected');
    const handleConnectError = () => setStatus('error');

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);

    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('connect_error', handleConnectError);
      newSocket.disconnect();
    };
  }, [token]);

  return useMemo(
    () => ({
      socket,
      status,
      isReady: status === 'connected'
    }),
    [socket, status]
  );
};

export default useSocket;
