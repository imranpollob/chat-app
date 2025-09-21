import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import clsx from 'clsx';

const CreateRoomModal = ({
  open,
  onClose,
  roomTypes,
  form,
  setForm,
  creating,
  onSubmit,
}) => {
  return (
    <Transition show={open} as={Fragment}>
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
            <Dialog.Panel className="w-full max-w-lg space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
              <div className="space-y-1">
                <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-white">
                  Create a new room
                </Dialog.Title>
                <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
                  Group conversations by topic, team, or project.
                </Dialog.Description>
              </div>

              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="roomName">
                    Room name
                  </label>
                  <input
                    id="roomName"
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
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
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
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
                          form.type === option.value
                            ? 'border-brand-400 bg-brand-50 text-slate-900 dark:border-brand-500 dark:bg-brand-500/10 dark:text-slate-100'
                            : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/60 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-brand-500/30 dark:hover:bg-slate-900'
                        )}
                      >
                        <input
                          type="radio"
                          name="room-type"
                          value={option.value}
                          checked={form.type === option.value}
                          onChange={() => setForm((prev) => ({ ...prev, type: option.value }))}
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
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-60"
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create room'}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CreateRoomModal;
