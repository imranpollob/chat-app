import clsx from 'clsx';
import { GlobeAltIcon, UserGroupIcon, LockClosedIcon } from '@heroicons/react/24/outline';

const DiscoverRoomCard = ({ room, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(room)}
    className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-brand-400 hover:shadow-lg dark:border-slate-900 dark:bg-slate-900"
  >
    <div className="flex items-center justify-between gap-2">
      <p className="truncate text-base font-semibold text-slate-900 dark:text-white" title={room.name}>
        {room.name}
      </p>
      <span
        className={clsx(
          'inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs uppercase transition',
          room.type === 'public'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200'
            : room.type === 'request'
              ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200'
              : 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200'
        )}
        title={
          room.type === 'public'
            ? 'Public room'
            : room.type === 'request'
              ? 'Request-to-join room'
              : 'Private room'
        }
      >
        {room.type === 'public' ? (
          <GlobeAltIcon className="h-4 w-4" />
        ) : room.type === 'request' ? (
          <UserGroupIcon className="h-4 w-4" />
        ) : (
          <LockClosedIcon className="h-4 w-4" />
        )}
      </span>
    </div>
    <p className="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">
      {room.description || 'No description provided.'}
    </p>
    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
      <span>
        {room.memberCount} member{room.memberCount === 1 ? '' : 's'}
      </span>
      <span className="ml-auto font-medium text-slate-600 dark:text-slate-300">
        {room.isMember ? (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
            {room.isOwner ? 'Owner' : room.isModerator ? 'Moderator' : room.isMember ? 'Member' : ''}
          </span>
        ) : room.hasPendingRequest ? (
          <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
            Request pending
          </span>
        ) : null}
      </span>
    </div>
  </button>
);

export default DiscoverRoomCard;
