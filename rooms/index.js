// Registry of rooms in the house. Add new rooms here as they are modeled.
export const ROOMS = [
  { id: 'kitchen', name: 'Kitchen', load: () => import('./kitchen.js') },
];
