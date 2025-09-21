import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import dayjs from 'dayjs';

const DiscoverRoomModal = ({
  room,
  joiningRoomId,
  onClose,
  onJoinOrRequest,
  onOpenChat,
  isAlreadyMember,
}) => (
  <Transition show={Boolean(room)} as={Fragment}>
    <Dialog className="relative z-50" onClose={onClose}>
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
          <Dialog.Panel className="w-full max-w-xl space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
            {room ? (
              <>
                <div className="space-y-1">
                  <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-white">
                    {room.name}
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
                    Hosted by {room.owner} • {room.memberCount} member{room.memberCount === 1 ? '' : 's'}
                  </Dialog.Description>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {room.description || 'No description provided for this room yet.'}
                </p>

                {room.lastMessage ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
                    <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Last activity</p>
                    <p className="mt-1 font-medium text-slate-600 dark:text-slate-200">
                      {room.lastMessage.sender ? `${room.lastMessage.sender}: ` : ''}
                      {room.lastMessage.text}
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {dayjs(room.lastActivity).fromNow()}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="rounded-full bg-slate-100 px-3 py-1 capitalize dark:bg-slate-800">{room.type}</span>
                  {room.hasPendingRequest ? (
                    <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                      Request pending
                    </span>
                  ) : null}
                  {room.isMember ? (
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                      You’re a member
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Close
                  </button>
                  {isAlreadyMember ? (
                    <button
                      type="button"
                      onClick={onOpenChat}
                      className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                    >
                      Open chat
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onJoinOrRequest}
                      className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={joiningRoomId === room.id || room.hasPendingRequest}
                    >
                      {joiningRoomId === room.id
                        ? 'Processing...'
                        : room.type === 'request'
                          ? room.hasPendingRequest
                            ? 'Request pending'
                            : 'Request to join'
                          : 'Join room'}
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </Dialog.Panel>
        </Transition.Child>
      </div>
    </Dialog>
  </Transition>
);

export default DiscoverRoomModal;
