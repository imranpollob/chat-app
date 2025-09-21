import { UserPlusIcon } from '@heroicons/react/24/outline';

const InviteForm = ({ username, setUsername, inviting, onSubmit }) => {
  return (
    <div className="mt-6">
      <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Invite teammates</h4>
      <form className="mt-3 flex flex-col gap-3 sm:flex-row" onSubmit={onSubmit}>
        <div className="relative flex-1">
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter username"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={inviting}
        >
          <UserPlusIcon className="h-4 w-4" />
          {inviting ? 'Inviting...' : 'Send invite'}
        </button>
      </form>
    </div>
  );
};

export default InviteForm;
