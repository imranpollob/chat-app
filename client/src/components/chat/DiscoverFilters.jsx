import { PlusIcon } from '@heroicons/react/24/outline';

const DiscoverFilters = ({
  searchValue,
  onSearchChange,
  typeValue,
  onTypeChange,
  onSubmit,
  onReset,
  onCreateRoom,
}) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md transition-colors duration-300 dark:border-slate-900 dark:bg-slate-900">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <form className="flex w-full flex-col gap-4 md:flex-row md:items-end" onSubmit={onSubmit}>
        <div className="flex-1">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="discoverSearch">
            Search rooms
          </label>
          <input
            id="discoverSearch"
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by room name"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="md:w-48">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="discoverType">
            Type
          </label>
          <select
            id="discoverType"
            value={typeValue}
            onChange={(e) => onTypeChange(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
          >
            <option value="all">All rooms</option>
            <option value="owner">Owner</option>
            <option value="moderator">Moderator</option>
            <option value="member">Member</option>
            <option value="public">Public</option>
            <option value="request">Request to Join</option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            Search
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onCreateRoom}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-brand-600 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-slate-800"
          >
            <PlusIcon className="h-4 w-4" />
            Create room
          </button>
        </div>
      </form>
    </div>
    <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
      Browse public rooms that you can join instantly or request access to moderated spaces.
    </p>
  </div>
);

export default DiscoverFilters;
