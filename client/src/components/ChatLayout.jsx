import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { MoonIcon, SunIcon, PlusIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import clsx from 'clsx';
import {
  createRoom,
  fetchMessages,
  fetchRequests,
  fetchRooms,
  inviteUser,
  updateRequest
} from '../api/rooms';
import useAuth from '../hooks/useAuth';
import useSocket from '../hooks/useSocket';
import useTheme from '../hooks/useTheme';

dayjs.extend(relativeTime);

const roomTypes = [
  {
    value: 'public',
    label: 'Public',
    description: 'Visible to everyone. Anyone can join instantly.'
  },
  {
    value: 'request',
    label: 'Request to Join',
    description: 'Visible to everyone. Owner approval required before joining.'
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Hidden from discovery. Only invited users can join.'
  }
];

const defaultRoomForm = {
  name: '',
  description: '',
  type: 'public'
};

const ChatLayout = () => {
  const { user, logout } = useAuth();
  const { socket, status: socketStatus, isReady } = useSocket();
  const { isDark, toggleTheme } = useTheme();

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [activeRoomId, setActiveRoomId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [pendingState, setPendingState] = useState(false);

  const [roomRequests, setRoomRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [createRoomForm, setCreateRoomForm] = useState(defaultRoomForm);
  const [creatingRoom, setCreatingRoom] = useState(false);

  const [inviteUsername, setInviteUsername] = useState('');
  const [inviting, setInviting] = useState(false);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) || null,
    [rooms, activeRoomId]
  );

  const isOwner = Boolean(activeRoom?.isOwner);

  const loadRooms = useCallback(async () => {
    try {
      setRoomsLoading(true);
      const data = await fetchRooms();
      setRooms(data);
      if (!activeRoomId && data.length > 0) {
        setActiveRoomId(data[0].id);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load rooms';
      toast.error(message);
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  }, [activeRoomId]);

  const loadMessages = useCallback(async (roomId) => {
    if (!roomId) return;
    try {
      setMessagesLoading(true);
      const data = await fetchMessages(roomId);
      setMessages(
        data.map((message) => ({
          id: message.id,
          type: 'message',
          text: message.text,
          username: message.username,
          timestamp: message.timestamp,
          roomId
        }))
      );
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

  const handleSelectRoom = (roomId) => {
    setActiveRoomId(roomId);
  };

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    if (!createRoomForm.name.trim()) {
      toast.error('Room name is required');
      return;
    }

    setCreatingRoom(true);
    try {
      const newRoom = await createRoom({ ...createRoomForm, name: createRoomForm.name.trim() });
      toast.success('Room created');
      setRooms((prev) => [...prev, newRoom].sort((a, b) => a.name.localeCompare(b.name)));
      setActiveRoomId(newRoom.id);
      setIsCreateRoomOpen(false);
      setCreateRoomForm(defaultRoomForm);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create room';
      toast.error(message);
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleRequestAction = async (requestId, action) => {
    if (!activeRoomId) return;
    try {
      const response = await updateRequest(activeRoomId, { userId: requestId, action });
      toast.success(response.message);
      await loadRooms();
      const refreshed = await fetchRequests(activeRoomId);
      setRoomRequests(refreshed.requests || []);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update request';
      toast.error(message);
    }
  };

  const handleInvite = async (event) => {
    event.preventDefault();
    if (!inviteUsername.trim()) {
      toast.error('Enter a username to invite');
      return;
    }

    try {
      setInviting(true);
      const response = await inviteUser(activeRoomId, { username: inviteUsername.trim() });
      toast.success(response.message);
      setInviteUsername('');
      await loadRooms();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to invite user';
      toast.error(message);
    } finally {
      setInviting(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!socket || !activeRoomId) {
      return;
    }

    const handleIncomingMessage = (payload) => {
      if (payload.roomId !== activeRoomId) return;
      setMessages((previous) => [
        ...previous,
        {
          id: payload.id,
          type: 'message',
          text: payload.text,
          username: payload.username,
          timestamp: payload.timestamp,
          roomId: payload.roomId
        }
      ]);
    };

    const handleUserEvent = (payload) => {
      if (!payload || payload.roomId !== activeRoomId) return;
      const eventId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      setMessages((previous) => [
        ...previous,
        {
          id: eventId,
          type: 'event',
          text: payload.message,
          timestamp: new Date().toISOString(),
          roomId: payload.roomId
        }
      ]);
    };

    socket.on('room:message', handleIncomingMessage);
    socket.on('room:userEvent', handleUserEvent);

    return () => {
      socket.off('room:message', handleIncomingMessage);
      socket.off('room:userEvent', handleUserEvent);
    };
  }, [socket, activeRoomId]);

  useEffect(() => {
    if (!socket || !activeRoomId || !isReady) return;

    setMessages([]);
    setPendingState(false);

    socket.emit('joinRoom', { roomId: activeRoomId }, async (response) => {
      if (!response) {
        await loadMessages(activeRoomId);
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

      await loadMessages(activeRoomId);
    });
  }, [socket, isReady, activeRoomId, loadMessages]);

  useEffect(() => {
    const loadRequests = async () => {
      if (!activeRoomId || !isOwner) {
        setRoomRequests([]);
        return;
      }

      try {
        setRequestsLoading(true);
        const data = await fetchRequests(activeRoomId);
        setRoomRequests(data.requests || []);
      } catch (error) {
        const message = error.response?.data?.message || 'Failed to load requests';
        toast.error(message);
      } finally {
        setRequestsLoading(false);
      }
    };

    loadRequests();
  }, [activeRoomId, isOwner]);

  const handleMessageSubmit = (event) => {
    event.preventDefault();
    if (!socket || !isReady || !activeRoomId) {
      toast.error('You must join a room before sending messages');
      return;
    }

    const formData = new FormData(event.target);
    const text = formData.get('message');
    if (!text?.trim()) return;

    socket.emit('chatMessage', { roomId: activeRoomId, text: text.trim() }, (response) => {
      if (response?.status === 'error') {
        toast.error(response.message || 'Failed to send message');
      }
    });

    event.target.reset();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 transition-colors duration-300 dark:border-slate-900/70 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">NovaChat</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Connect with your team in real time.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.username}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {socketStatus === 'connected' ? 'Online' : socketStatus === 'error' ? 'Error' : 'Offline'}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-1 gap-6 px-6 py-6">
        <aside className="w-72 shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Rooms
            </h2>
            <button
              type="button"
              onClick={() => setIsCreateRoomOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-brand-600 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-slate-800"
              title="Create room"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm transition-colors duration-300 dark:border-slate-900 dark:bg-slate-900/60">
            {roomsLoading ? (
              <p className="px-2 py-4 text-sm text-slate-500 dark:text-slate-400">Loading rooms...</p>
            ) : rooms.length === 0 ? (
              <p className="px-2 py-4 text-sm text-slate-500 dark:text-slate-400">
                No rooms yet. Create one to get started.
              </p>
            ) : (
              rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => handleSelectRoom(room.id)}
                  className={clsx(
                    'w-full rounded-xl border px-4 py-3 text-left transition shadow-sm',
                    room.id === activeRoomId
                      ? 'border-brand-400 bg-brand-50 text-slate-900 dark:border-brand-500 dark:bg-brand-500/10 dark:text-slate-100'
                      : 'border-transparent bg-white hover:border-brand-300 hover:bg-brand-50/70 dark:bg-slate-900/50 dark:hover:border-brand-500/30 dark:hover:bg-slate-900'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{room.name}</p>
                    <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {room.type}
                    </span>
                  </div>
                  {room.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{room.description}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{room.memberCount} member{room.memberCount === 1 ? '' : 's'}</span>
                    <span>• Owner: {room.isOwner ? 'You' : room.owner}</span>
                    {room.pendingCount > 0 && room.isOwner && room.type === 'request' ? (
                      <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                        {room.pendingCount} pending
                      </span>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex-1 space-y-4">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md transition-colors duration-300 dark:border-slate-900 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {activeRoom ? activeRoom.name : 'Select a room'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {activeRoom ? activeRoom.description || 'Welcome to your chatroom.' : 'No room selected'}
                </p>
              </div>
              {activeRoom ? (
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{activeRoom.memberCount} members</span>
                  <span>• Created {dayjs(activeRoom.createdAt).fromNow()}</span>
                </div>
              ) : null}
            </div>

            <div className="h-[420px] overflow-y-auto px-6 py-6 space-y-3 bg-slate-50/70 transition-colors duration-300 dark:bg-slate-950/40">
              {messagesLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading conversation...</p>
              ) : pendingState ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Waiting for approval. You will be notified once the owner approves your request.
                </p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No messages yet. Start the conversation!</p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={clsx(
                      'rounded-2xl border px-4 py-3 shadow-sm transition',
                      message.type === 'event'
                        ? 'border-dashed border-slate-300 bg-white/70 text-center text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                    )}
                  >
                    {message.type === 'event' ? (
                      <p>{message.text}</p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{message.username}</span>
                          <span>{dayjs(message.timestamp).fromNow()}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">{message.text}</p>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <form className="flex items-center gap-3" onSubmit={handleMessageSubmit}>
                <input
                  name="message"
                  type="text"
                  placeholder={pendingState ? 'Awaiting approval...' : 'Write a message'}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
                  disabled={!activeRoom || messagesLoading || pendingState}
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!activeRoom || messagesLoading || pendingState}
                >
                  Send
                </button>
              </form>
            </div>
          </div>

          {activeRoom && isOwner ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md transition-colors duration-300 dark:border-slate-900 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Owner tools
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manage join requests and invite users.</p>
                </div>
              </div>

              {activeRoom.type === 'request' ? (
                <div className="mt-6">
                  <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Pending requests</h4>
                  <div className="mt-3 space-y-2">
                    {requestsLoading ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Loading requests...</p>
                    ) : roomRequests.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No pending requests right now.</p>
                    ) : (
                      roomRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{request.username}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Waiting for your approval</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRequestAction(request.id, 'deny')}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              Deny
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRequestAction(request.id, 'approve')}
                              className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {activeRoom.type === 'private' ? (
                <div className="mt-6">
                  <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Invite a teammate</h4>
                  <form className="mt-3 flex flex-col gap-3 sm:flex-row" onSubmit={handleInvite}>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={inviteUsername}
                        onChange={(event) => setInviteUsername(event.target.value)}
                        placeholder="Enter username to invite"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={inviting}
                    >
                      <UserPlusIcon className="h-4 w-4" />
                      {inviting ? 'Inviting...' : 'Send Invite'}
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>

      <Transition show={isCreateRoomOpen} as={Fragment}>
        <Dialog className="relative z-50" onClose={() => setIsCreateRoomOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-3"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-3"
            >
              <Dialog.Panel className="w-full max-w-lg space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-1">
                  <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-white">
                    Create a new room
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
                    Group conversations by topic, team, or project.
                  </Dialog.Description>
                </div>

                <form className="space-y-5" onSubmit={handleCreateRoom}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="roomName">
                      Room name
                    </label>
                    <input
                      id="roomName"
                      type="text"
                      value={createRoomForm.name}
                      onChange={(event) =>
                        setCreateRoomForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder="e.g. design-lab"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="roomDescription">
                      Description
                    </label>
                    <textarea
                      id="roomDescription"
                      rows={3}
                      value={createRoomForm.description}
                      onChange={(event) =>
                        setCreateRoomForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Tell members what this room is about"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Privacy</p>
                    <div className="grid gap-3 md:grid-cols-3">
                      {roomTypes.map((option) => (
                        <label
                          key={option.value}
                          className={clsx(
                            'cursor-pointer rounded-2xl border px-4 py-3 transition shadow-sm',
                            createRoomForm.type === option.value
                              ? 'border-brand-400 bg-brand-50 text-slate-900 dark:border-brand-500 dark:bg-brand-500/10 dark:text-slate-100'
                              : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/60 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-brand-500/30 dark:hover:bg-slate-900'
                          )}
                        >
                          <input
                            type="radio"
                            name="room-type"
                            value={option.value}
                            checked={createRoomForm.type === option.value}
                            onChange={() =>
                              setCreateRoomForm((prev) => ({ ...prev, type: option.value }))
                            }
                            className="hidden"
                          />
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{option.label}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{option.description}</p>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => setIsCreateRoomOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-60"
                      disabled={creatingRoom}
                    >
                      {creatingRoom ? 'Creating...' : 'Create room'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default ChatLayout;
