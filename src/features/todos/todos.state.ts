import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { todoPrioritySchema, type TodoPriority } from './todos.schema';

// Client state only, and only what belongs to this browser. The list is server data and lives in
// the query cache; the filter and the search term describe a view worth sharing, so they live in
// the URL (see src/routes/todos/index.tsx). What is left is a preference: nobody wants to share a
// link to someone else's default priority.

// Storage is shared with other tabs and with every version of this app that ever ran, so what
// comes back out of it is `unknown` however the atom is typed. Everything below the atom exists to
// keep a stale or hand-edited string from reaching a component as a TodoPriority.
const jsonStorage = createJSONStorage<unknown>();

function asPriority(value: unknown): TodoPriority | undefined {
  const parsed = todoPrioritySchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

// The priority the next todo gets. It sits here rather than in the form so the picker beside the
// form can change it, and add-todo-form.tsx reads it at submit instead of mirroring it. Without
// `getOnInit` the first render shows 'normal' and corrects itself on mount.
export const newTodoPriorityAtom = atomWithStorage<TodoPriority>(
  'todos:priority',
  'normal',
  {
    // Falling back leaves the invalid string in storage: the next valid pick overwrites it, and
    // until then nothing has been thrown away on the user's behalf.
    getItem: (key, initialValue) =>
      asPriority(jsonStorage.getItem(key, initialValue)) ?? initialValue,
    setItem: (key, value) => {
      jsonStorage.setItem(key, value);
    },
    removeItem: (key) => {
      jsonStorage.removeItem(key);
    },
    // An invalid write from another tab is dropped rather than applied. Falling back to the
    // initial value here would overwrite a choice this tab's user made.
    subscribe: (key, callback, initialValue) =>
      jsonStorage.subscribe?.(
        key,
        (value) => {
          const priority = asPriority(value);
          if (priority !== undefined) callback(priority);
        },
        initialValue,
      ),
  },
  { getOnInit: true },
);
