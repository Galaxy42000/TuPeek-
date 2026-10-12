// ============================================================================
//  KITCHEN — every number in this file is in INCHES.
//  Source: Cyncly / NKBA plan, Drawing #1 (designed 3/14/2026, printed 3/17/2026).
//
//  How positions work
//  ------------------
//  • Walls are named by PLAN direction, as seen on the plan with its title
//    block at the bottom: north = top of the plan (range wall),
//    east = right side (sink wall). The west and south sides are open.
//    The plan is turned on the site: its top is true EAST (the sink window
//    looks due south; see rooms/site.js). The viewer shows true directions, so
//    there the range wall is the east wall and the sink wall is the south wall.
//    IDs and notes below are written in true directions.
//  • "start" on a wall = distance from that wall's LEFT corner, as you stand
//    in the kitchen facing that wall:
//      - north wall: measured from the west reference line (left edge of the
//        144¾″ dimension).
//      - east wall: measured from the north-east corner.
//  • Free-standing things (island, tall cabinet) use x = inches east of the
//    west reference line and z = inches south of the north wall.
//  • Items in a run are listed left → right as you face them, and their widths
//    add up, so changing one width shifts everything to its right.
//  • `code` is the cabinet code printed on the plan.
//  • `surfaces` and `materials` record what things are made of (shown when you
//    click them); see rooms/materials.js.
// ============================================================================

const RANGE_CENTER = 30 + 15 / 16 + 53.75; // 84 11/16″ from the west reference line
const RANGE_START = RANGE_CENTER - 15;
const FRIDGE_SPACE = RANGE_START - 21 - 36; // left edge of the 36″ fridge opening

export default {
  id: 'kitchen',
  name: 'Kitchen',

  room: {
    width: 144.75, // north wall, west reference line → east wall
    depth: 122.75, // east wall, north wall → end of the east wall
    height: 96, // ⚠ not on the plan; 8′ walls, estimated from the kitchen photo
    // Vaulted ceiling on scissor trusses, 9′ at the peak. It spans the whole main room
    // (15′-5″), whose east wall is the kitchen's sink wall, so it starts 40¼″ west of the
    // kitchen's west reference line. Keep in step with the vault in rooms/house.js.
    vault: { x0: 144.75 - 185, x1: 144.75, peak: 108 },
    wallThickness: 4.5,
    // only the north and east walls exist; the north wall carries on to the west
    walls: {
      north: { extendLeft: 48 },
      east: { extendRight: 0 },
    },
    // floor continues past the open west and south sides
    floorMargin: { west: 48, south: 60 },
  },

  palette: {
    walls: '#e8e3d9',
    ceiling: '#f6f5f1',
    trim: '#f8f7f3',
    floor: '#b08458', // wood tone
    floorPlankWidth: 4,
    floorBoards: 'north-south', // plan direction the boards run (true east–west)
    cabinets: '#f1efe9',
    island: '#41566b',
    counter: '#e9e7e2', // quartz-like speckle
    backsplash: '#f5f4ef',
    grout: '#d2cfc7',
    hardware: '#2a2a2a',
    stoolSeat: '#8a6544',
    stoolLegs: '#1d1d1d',
    pendant: '#b08d57',
    cherry: '#8a4a2c', // varnished cherry window sills
    // granite: '#…',  // kitchen window sill; color not known yet, drawn like the countertop
  },

  // Default materials by kind of surface (keys from rooms/materials.js).
  surfaces: {
    floor: ['oakFloor'],
    windows: ['cherrySill', 'drywallReturns'],
  },

  style: {
    doorStyle: 'shaker', // 'shaker' | 'slab'
    handle: 'bar', // 'bar' | 'knob'
    baseboard: true,
    // Windows have no casing: the tops and sides are drywall returns, painted like the
    // walls, with only a sill (varnished cherry unless a window says otherwise).
    windowTrim: 'returns',
    windowSill: 'cherry',
  },

  // type: 'window' | 'door' | 'opening';  bottom = height of the opening's sill above the floor
  openings: [
    // 36″ from the corner, 36½″ wide (plan). Sill and head heights are not on the plan.
    // finished opening 3′-8″ square in a 4′ × 4′ rough opening (from the owner; the plan
    // drew it 36½″ wide), kept centered on the sink
    { id: 'W1', type: 'window', wall: 'east', start: 54.25 - 22, width: 44, bottom: 44, height: 44, sill: 'granite', materials: ['kolbeWindow', 'graniteSill', 'drywallReturns'],
      notes: '3′-8″ × 3′-8″ finished (4′ × 4′ rough opening). Centered on the sink as on the plan. ⚠ Height assumed: rough opening from 42″ to 90″, finished 2″ inside it all round. The plan drew a 36½″ window; at 3′-8″ it still runs ¾″ behind U6 and ½″ behind U7.' },
  ],

  // Base cabinets: 24″ deep, 34½″ tall + 1½″ counter = 36″ counter height.
  // kind: 'cabinet' (default) | 'sink' | 'dishwasher' | 'range' | 'panel' | 'gap'
  // fronts: 'door-drawer' | 'doors' | 'drawers2' | 'drawers3' | 'drawers4' | 'open'
  baseRuns: [
    {
      id: 'East run', // range wall
      wall: 'north',
      start: RANGE_START - 21,
      extendRight: 1 / 16, // meet the corner countertop
      items: [
        { id: 'B1', code: 'BD21.3', width: 21, fronts: 'drawers3' },
        { id: 'RANGE', code: 'RANGE.GAS.30', kind: 'range', width: 30 },
        { id: 'B2', code: 'BTP9', width: 9, fronts: 'doors', notes: '9″ tray pull-out.' },
      ],
    },
    {
      id: 'South run', // sink wall
      wall: 'east',
      start: 36, // after the 36″ diagonal corner cabinet
      extendRight: 1.25, // countertop runs past the end panel
      items: [
        { id: 'SINK', code: 'Sink base 36', kind: 'sink', width: 36, bowlWidth: 30, bowlDepth: 18, notes: 'Centered on the window, 54″ from the east wall.' },
        { id: 'DW', code: 'DISH-IC', kind: 'dishwasher', width: 24, notes: 'Centered 84″ from the east wall.' },
        { id: 'B3', code: 'B24BUTT.2DXFWT', width: 24, doors: 2 },
        { id: 'EP1', kind: 'panel', width: 0.75, notes: 'Finished end panel.' },
      ],
    },
  ],

  // Diagonal ("easy reach") corner cabinets; size = length along each wall.
  corners: [
    { id: 'B4', code: 'EZRD36', corner: 'north-east', kind: 'base', size: 36, depth: 24, fronts: 'doors' },
    { id: 'U5', code: 'WA2430L', corner: 'north-east', kind: 'wall', size: 24, depth: 12, bottom: 54, height: 30 },
  ],

  // Wall (upper) cabinets: bottom = height above floor of the cabinet's underside.
  // Uppers are 30″ tall hung at 54″, so their tops line up with the 84″ tall cabinet.
  // kind: 'cabinet' (default) | 'microwave' | 'hood' | 'gap';  fronts: 'doors' | 'glass' | 'open'
  wallRuns: [
    {
      id: 'East uppers',
      wall: 'north',
      start: FRIDGE_SPACE,
      bottom: 54,
      height: 30,
      items: [
        { id: 'U1', code: 'WR3612BUTT', width: 36, bottom: 72, height: 12, depth: 24, doors: 2, notes: 'Over the refrigerator.' },
        { id: 'U2', code: 'W2130L', width: 21 },
        { id: 'U3', code: 'W3015BUTT', width: 30, bottom: 69, height: 15, notes: 'Over the microwave.' },
        { id: 'U4', code: 'W2130R', width: 21, hinge: 'right' },
      ],
    },
    {
      id: 'Over-range microwave',
      wall: 'north',
      start: RANGE_START,
      items: [{ id: 'MW', kind: 'microwave', width: 30, bottom: 52.5, height: 16.5, depth: 15.5, notes: 'Over-the-range microwave (model label is partly hidden on the plan).' }],
    },
    {
      id: 'South uppers (corner side)',
      wall: 'east',
      start: 24, // after the diagonal corner wall cabinet
      bottom: 54,
      height: 30,
      items: [{ id: 'U6', code: 'WPP930', width: 9, notes: 'Circled on the plan; modeled as a 9″ × 30″ wall cabinet.' }],
    },
    {
      id: 'South uppers (past window)',
      wall: 'east',
      start: 122.75 - 2 - 45, // ends flush with the base run's end panel
      bottom: 54,
      height: 30,
      items: [
        { id: 'U7', code: 'W2130R', width: 21, hinge: 'right' },
        { id: 'U8', code: 'W2430BUTT', width: 24 },
      ],
    },
  ],

  // Tall items. On a wall (wall + start) or free-standing (x, z, facing).
  // type: 'fridge' | 'pantry'
  tall: [
    {
      id: 'TALL', code: 'U241284BUTT.EB.SH', type: 'pantry',
      x: 0, z: 0, width: 24, depth: 12, height: 84, facing: 'west', doors: 2,
      notes: '24″ wide × 12″ deep × 84″ tall utility cabinet at the north end, doors facing out of the kitchen.',
    },
    { id: 'FRIDGE', type: 'fridge', wall: 'north', start: FRIDGE_SPACE + 0.125, width: 35.75, height: 70, depth: 30, notes: '36″ opening. Front is 38¾″ from the island.' },
  ],

  // World-aligned boxes: x/z = north-west corner, width along x, depth along z.
  panels: [
    { id: 'EP-FRIDGE', x: 12, z: 0, width: FRIDGE_SPACE - 12, depth: 24.75, height: 84, notes: 'Panel between the tall cabinet and the fridge.' },
  ],

  islands: [
    {
      id: 'ISLAND',
      // north-west corner of the countertop; 74″ × 54″
      counter: { x: 7, z: 30 + 38.75, width: 74, depth: 54 },
      rows: [
        // faces the range; items listed left → right as you face them (east → west)
        {
          facing: 'north', x: 8, z: 30 + 38.75 + 1, depth: 24,
          items: [
            { id: 'I1', code: 'BD24.3', width: 24, fronts: 'drawers3' },
            { id: 'I2', code: 'BD24.3', width: 24, fronts: 'drawers3' },
            { id: 'I3', code: 'B24R.2DXFW', width: 24, hinge: 'right' },
          ],
        },
        // seating side, 13″ in from each end, under the 14″ overhang
        {
          facing: 'south', x: 7 + 13, z: 30 + 38.75 + 1 + 24, depth: 15,
          items: [
            { id: 'I4', code: 'B24BUTT.FH', width: 24, fronts: 'doors', doors: 2 },
            { id: 'I5', code: 'B24BUTT.FH', width: 24, fronts: 'doors', doors: 2 },
          ],
        },
      ],
      posts: [
        { id: 'POST-W', code: 'PSP3X3.34', x: 7, z: 30 + 38.75 + 54 - 3 },
        { id: 'POST-E', code: 'PSP3X3.34', x: 7 + 74 - 3, z: 30 + 38.75 + 54 - 3 },
      ],
      stools: { side: 'south', count: 3, offset: 6 },
    },
  ],

  lighting: {
    pendants: [{ over: 'ISLAND', count: 2, bottom: 66 }], // ⚠ placeholder
    // recessed ceiling lights as [x, z]  ⚠ placeholder
    cans: [
      [40, 50], [110, 50],
      [40, 105], [110, 105],
    ],
  },

  views: {
    eye: { pos: [-30, 64, 160], target: [95, 40, 25] },
  },
};
