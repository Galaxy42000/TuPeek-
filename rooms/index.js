import house from './house.js';

// Views in the room menu. Every room listed in house.js gets its own entry
// (the whole-house model, cut down to that room).
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const loadHouse = () => import('./house.js');

export const ROOMS = [
  { id: 'house', name: 'Whole house', load: loadHouse },
  { id: 'kitchen', name: 'Kitchen', load: () => import('./kitchen.js') },
  ...house.rooms.filter((r) => r.menu !== false).map((r) => ({ id: slug(r.name), name: r.name, load: loadHouse, focus: r.name })),
];
