import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchMessages } from '../api/rooms';

export default function useMessages({ socket, isReady, roomId, activeView }) {
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [pendingState, setPendingState] = useState(false);
  const messagesContainerRef = useRef(null);

  const loadMessages = useCallback(async (id) => {
    if (!id) return;
    try {
      setMessagesLoading(true);
      const data = await fetchMessages(id);
      const next = data.map((message) => ({
        id: message.id,
        type: 'message',
        text: message.text,
        username: message.username,
        timestamp: message.timestamp,
        roomId: id,
      }));
      setMessages(next);
      setPendingState(false);
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to load messages for this room';
      setMessages([]);
      setPendingState(true);
      toast.error(message);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const scrollMessagesToBottom = useCallback((behavior = 'smooth', force = false) => {
    const element = messagesContainerRef.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    const isNearBottom = distanceFromBottom < 96;
    if (!force && !isNearBottom) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
  }, []);

  const handleMessageSubmit = useCallback(
    (event) => {
      event.preventDefault();
      if (!socket || !isReady || !roomId) {
        toast.error('You must join a room before sending messages');
        return;
      }
      const formData = new FormData(event.target);
      const text = formData.get('message');
      if (!text?.trim()) return;
      socket.emit('chatMessage', { roomId, text: text.trim() }, (response) => {
        if (response?.status === 'error') {
          toast.error(response.message || 'Failed to send message');
        }
      });
      event.target.reset();
    },
    [socket, isReady, roomId]
  );

  useEffect(() => {
    if (!socket || !roomId || !isReady || activeView !== 'home') {
      // If a room is selected but socket isn't ready, still load history via REST once
      if (roomId && activeView === 'home' && (!socket || !isReady)) {
        if (!messagesLoading && messages.length === 0) {
          loadMessages(roomId);
        }
      }
      return;
    }
    setMessages([]);
    setPendingState(false);
    socket.emit('joinRoom', { roomId }, async (response) => {
      if (!response) {
        await loadMessages(roomId);
        return;
      }
      if (response.status === 'pending') {
        setPendingState(true);
        setMessages([]);
        toast('Join request sent to the room owner.');
        return;
      }
      if (response.status === 'error') {
        setPendingState(true);
        setMessages([]);
        toast.error(response.message || 'Unable to join room');
        return;
      }
      await loadMessages(roomId);
    });
  }, [socket, isReady, roomId, activeView, loadMessages]);

  useLayoutEffect(() => {
    if (!roomId || messagesLoading) return;
    scrollMessagesToBottom('auto', true);
  }, [roomId, messagesLoading, pendingState, scrollMessagesToBottom]);

  useLayoutEffect(() => {
    if (messagesLoading || messages.length === 0) return;
    const behavior = messages.length <= 1 ? 'auto' : 'smooth';
    scrollMessagesToBottom(behavior);
  }, [messages, messagesLoading, scrollMessagesToBottom]);

  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      setPendingState(false);
    }
  }, [roomId]);

  return {
    messages,
    setMessages,
    messagesLoading,
    pendingState,
    messagesRef: messagesContainerRef,
    loadMessages,
    handleMessageSubmit,
  };
}
