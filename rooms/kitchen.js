// ============================================================================
//  KITCHEN — every number in this file is in INCHES.
//
//  How positions work
//  ------------------
//  • Walls are named by compass direction: north, east, south, west.
//    (In the viewer, the north wall is the one with the sink window.)
//  • "start" on a wall = distance from that wall's LEFT corner, as you stand
//    in the room facing the wall.
//  • Cabinet runs list their boxes left → right; each box's width is added up,
//    so changing one width shifts everything to its right.
//  • Island center: x = inches from the west wall, z = inches from the north wall.
//
//  ⚠️  PLACEHOLDER LAYOUT — a generic L-shaped kitchen with an island.
//      It gets replaced with the real layout from the photo + your measurements.
// ============================================================================

export default {
  id: 'kitchen',
  name: 'Kitchen',

  room: {
    width: 180, // north & south wall length (15′)
    depth: 168, // east & west wall length (14′)
    height: 108, // floor to ceiling (9′)
    wallThickness: 4.5,
  },

  palette: {
    walls: '#e8e3d9',
    ceiling: '#f6f5f1',
    trim: '#f8f7f3',
    floor: '#b08458', // wood tone
    floorPlankWidth: 5,
    cabinets: '#f1efe9',
    island: '#41566b',
    counter: '#e9e7e2', // quartz-like speckle
    backsplash: '#f5f4ef',
    grout: '#d2cfc7',
    hardware: '#2a2a2a',
    stoolSeat: '#8a6544',
    stoolLegs: '#1d1d1d',
    pendant: '#b08d57',
  },

  style: {
    doorStyle: 'shaker', // 'shaker' | 'slab'
    handle: 'bar', // 'bar' | 'knob'
    baseboard: true,
  },

  // type: 'window' | 'door' | 'opening' (cased opening with no door)
  // bottom = height of the opening's bottom edge above the floor
  openings: [
    { id: 'W1', type: 'window', wall: 'north', start: 70, width: 40, bottom: 42, height: 44, grid: [2, 1] },
    { id: 'D1', type: 'door', wall: 'south', start: 24, width: 36, height: 80 },
    { id: 'O1', type: 'opening', wall: 'west', start: 36, width: 72, height: 84 },
  ],

  // Base cabinets: 24″ deep, 34½″ tall + 1½″ counter = 36″ counter height by default.
  // kind: 'cabinet' (default) | 'sink' | 'dishwasher' | 'range' | 'gap'
  // fronts: 'door-drawer' | 'doors' | 'drawers2' | 'drawers3' | 'drawers4' | 'open'
  baseRuns: [
    {
      id: 'North run',
      wall: 'north',
      start: 0,
      backsplash: 18,
      items: [
        { id: 'B1', width: 18, fronts: 'drawers3' },
        { id: 'B2', width: 30 },
        { id: 'DW', kind: 'dishwasher', width: 24 },
        { id: 'SINK', kind: 'sink', width: 36 },
        { id: 'B3', width: 24 },
        { id: 'B4', width: 24, fronts: 'drawers3' },
        { id: 'B5', width: 24, fronts: 'doors', notes: 'Corner cabinet' },
      ],
    },
    {
      id: 'East run',
      wall: 'east',
      start: 24, // the north run's corner cabinet fills the first 24″
      backsplash: 18,
      items: [
        { id: 'B6', width: 18 },
        { id: 'RANGE', kind: 'range', width: 30 },
        { id: 'B7', width: 18, fronts: 'drawers3' },
      ],
    },
  ],

  // Wall (upper) cabinets: bottom = height above floor of the cabinet's underside.
  // kind: 'cabinet' (default) | 'hood' | 'gap';  fronts: 'doors' | 'glass' | 'open'
  wallRuns: [
    {
      id: 'North uppers left',
      wall: 'north',
      start: 0,
      bottom: 54,
      height: 36,
      items: [
        { id: 'U1', width: 18 },
        { id: 'U2', width: 30 },
        { id: 'U3', width: 18 },
      ],
    },
    {
      id: 'North uppers right',
      wall: 'north',
      start: 114,
      bottom: 54,
      height: 36,
      items: [
        { id: 'U4', width: 24, fronts: 'glass' },
        { id: 'U5', width: 18 },
        { id: 'U6', width: 24 },
      ],
    },
    {
      id: 'East uppers',
      wall: 'east',
      start: 12,
      bottom: 54,
      height: 36,
      items: [
        { id: 'U7', width: 30 },
        { id: 'HOOD', kind: 'hood', width: 30, bottom: 66 },
        { id: 'U8', width: 18 },
      ],
    },
    {
      id: 'Over fridge',
      wall: 'east',
      start: 114,
      bottom: 72,
      height: 18,
      depth: 24,
      items: [{ id: 'U9', width: 36 }],
    },
  ],

  // Full-height items. type: 'fridge' | 'pantry'
  tall: [
    { id: 'PANTRY', type: 'pantry', wall: 'east', start: 90, width: 24, height: 90, depth: 24 },
    { id: 'FRIDGE', type: 'fridge', wall: 'east', start: 114, width: 36, height: 70, depth: 30 },
  ],

  islands: [
    {
      id: 'ISLAND',
      center: { x: 84, z: 84 },
      facing: 'north', // which way the cabinet doors face
      overhang: { front: 1, back: 12, sides: 1 },
      stools: 3,
      items: [
        { id: 'I1', width: 30, fronts: 'drawers3' },
        { id: 'I2', width: 30, fronts: 'doors' },
      ],
    },
  ],

  lighting: {
    // pendants hang over an island; bottom = height of the shade's bottom edge
    pendants: [{ over: 'ISLAND', count: 3, bottom: 68 }],
    // recessed ceiling lights as [x from west wall, z from north wall]
    cans: [
      [45, 40], [135, 40],
      [45, 135], [135, 135],
    ],
  },
};
