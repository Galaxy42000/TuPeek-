import site from '../rooms/site.js';

// Converts plan directions (north = top of the drawing) into true compass directions.
const ORDER = ['north', 'east', 'south', 'west'];
const TURN = ORDER.indexOf(site.planNorthIs); // quarter turns clockwise, plan → true
const RANK = { north: 0, south: 1, east: 2, west: 3 };

// 'north' → 'east', 'north-east' → 'south-east', 'east–west' → 'north–south'
export function trueDir(plan) {
  const sep = plan.includes('–') ? '–' : '-';
  return plan
    .split(sep)
    .map((w) => ORDER[(ORDER.indexOf(w) + TURN) % 4])
    .sort((a, b) => RANK[a] - RANK[b])
    .join(sep);
}

export const capDir = (plan) => {
  const d = trueDir(plan);
  return d[0].toUpperCase() + d.slice(1);
};

// Model-space (x, z) unit vector pointing toward a true compass direction.
const PLAN_VEC = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };
export const trueVec = (dir) => PLAN_VEC[ORDER[(ORDER.indexOf(dir) - TURN + 4) % 4]];

export const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
