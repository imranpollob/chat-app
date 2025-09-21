const MemberManagement = ({
  members,
  banned,
  loading,
  canManageMembers,
  canPromoteMembers,
  currentUserId,
  currentRole,
  onAction,
}) => {
  if (!canManageMembers) return null;
  return (
    <div className="mt-6">
      <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Members</h4>
      {loading ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading members...</p>
      ) : members.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No members found.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {members.map((member) => {
            const isSelf = member.id === currentUserId;
            const isTargetOwner = member.role === 'owner';
            const isTargetModerator = member.role === 'moderator';
            const canRemove =
              !isSelf &&
              !isTargetOwner &&
              ((canPromoteMembers && (member.role === 'member' || isTargetModerator)) ||
                (currentRole === 'moderator' && member.role === 'member'));
            const canBan = canRemove;
            const canPromote = canPromoteMembers && member.role === 'member';
            const canDemote = canPromoteMembers && member.role === 'moderator';

            return (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">{member.username}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {member.role === 'owner' ? 'Moderator' : member.role}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canPromote ? (
                    <button
                      type="button"
                      onClick={() => onAction(member.id, 'promote')}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Promote
                    </button>
                  ) : null}
                  {canDemote ? (
                    <button
                      type="button"
                      onClick={() => onAction(member.id, 'demote')}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Demote
                    </button>
                  ) : null}
                  {canRemove ? (
                    <button
                      type="button"
                      onClick={() => onAction(member.id, 'remove')}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-amber-600 transition hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 dark:border-slate-700 dark:text-amber-300 dark:hover:bg-slate-800/70"
                    >
                      Remove
                    </button>
                  ) : null}
                  {canBan ? (
                    <button
                      type="button"
                      onClick={() => onAction(member.id, 'ban')}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 dark:border-slate-700 dark:text-rose-400 dark:hover:bg-rose-500/20"
                    >
                      Ban
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canManageMembers && banned.length > 0 ? (
        <div className="mt-6">
          <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Banned</h4>
          <div className="mt-3 space-y-2">
            {banned.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="text-slate-700 dark:text-slate-200">{entry.username}</span>
                <button
                  type="button"
                  onClick={() => onAction(entry.id, 'unban')}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:border-slate-700 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                >
                  Unban
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MemberManagement;
