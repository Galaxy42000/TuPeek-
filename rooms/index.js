// Registry of rooms in the house. Add new rooms here as they are modeled.
export const ROOMS = [
  { id: 'house', name: 'Whole house', load: () => import('./house.js') },
  { id: 'kitchen', name: 'Kitchen', load: () => import('./kitchen.js') },
];
