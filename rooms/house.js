// ============================================================================
//  WHOLE HOUSE — every number in this file is in INCHES.
//  Source: hand-drawn plan view (blueprint sketch). Dimensions written on it:
//    34′-3″  overall length (top to bottom of the plan; true east–west)
//    24′-3″  bedroom wing length, same direction
//    15′-5″ R.O.  main room width (left to right; true north–south)
//    7′-0″ × 6′-0″  bathroom
//    Takagi T-H3S-DV-P water heater, 11¼″ × 17¾″ × 24⅞″
//  Interior photos: bedroom 1 looking into bedroom 2 (no wall between them,
//    steel beam over the bedroom 1 door, bedroom wing windows); kitchen looking
//    into the living room (vaulted kitchen ceiling on scissor trusses with a 9′
//    peak, steel beam across the living room, its windows, the mini-split);
//    the kitchen without cabinets (4′ × 4′ window, 6′ sliding glass door, 8′ walls);
//    outside at the bathroom end (bathroom window with the condenser under it).
//  Anything marked ⚠ is not written on the plan: it was scaled off the drawing
//  or a photo, or assumed, and should be measured.
//
//  How positions work
//  ------------------
//  • Directions in this file are PLAN directions: north is the top of the plan
//    (bathroom end). x = inches east of the building's west outside face,
//    z = inches south of its north outside face.
//  • On the site the plan is turned: its top is true EAST (the kitchen sink
//    window looks due south; see rooms/site.js). The viewer shows true
//    directions, and the IDs and notes below are written in true directions,
//    e.g. the wall at the top of the plan is called the east wall.
//  • `surfaces` and `materials` record what things are made of (shown when you
//    click them); see rooms/materials.js.
//  • Walls are boxes: x0–x1 by z0–z1. `inside` names the side the (main) room is
//    on, which is the face that gets the window/door trim.
//  • A door's or window's `at` is its distance from the wall's north end (walls
//    running north–south) or west end (walls running east–west).
//  • The kitchen is built from rooms/kitchen.js and placed unchanged; its window
//    is carried over onto the east wall automatically.
// ============================================================================

import kitchen from './kitchen.js';
import { fmtFt } from '../js/units.js';

const HEIGHT = 96; // ⚠ wall height (8′), from the kitchen photo: the 6′ slider is a standard 6′-8″ tall
const PEAK = 108; // 9′-0″ peak of the vaulted kitchen ceiling (keep HEIGHT and PEAK in step with rooms/kitchen.js)
const LIVING_CEILING = 84; // ⚠ the living room's flat ceiling looks lower (about 7′), flush with the beam's underside
const EXT = 6; // ⚠ exterior wall thickness
const INT = 4.5; // interior partition thickness
const OLD = 6; // ⚠ wall between the bedroom wing and the main room

const LENGTH = 411; // 34′-3″ outside face to outside face
const WING_LENGTH = 291; // 24′-3″
const WING_WIDTH = 115; // ⚠ inside width of the bedroom wing, estimated from the photo with an 8′ ceiling (the drawing scaled to 88″)
const MAIN_WIDTH = 185; // 15′-5″ R.O.
const BATH_WIDTH = 84; // 7′-0″
const BATH_DEPTH = 72; // 6′-0″

const X_MAIN = EXT + WING_WIDTH + OLD; // west face of the main room (100)
const X_EAST = X_MAIN + MAIN_WIDTH; // east wall, inside face (285)
const WIDTH = X_EAST + EXT; // overall width (291) ⚠ follows from the assumptions above
const Z_SOUTH = LENGTH - EXT; // south wall, inside face (405)

const X_BATH = X_EAST - BATH_WIDTH; // bathroom's west inside face (201)
const Z_BATH = EXT + BATH_DEPTH; // bathroom's south inside face (78)
const Z_CLOSET = 37; // ⚠ front of the utility room (scaled)
const DIVIDER = 154; // ⚠ where bedroom 1 ends and bedroom 2 begins; there is no wall between them
const D_BR1 = 85.5; // ⚠ north jamb of the bedroom 1 door (scaled)

// The kitchen's east wall is the building's east wall, and its north wall is the
// bathroom's south wall.
const KX = X_EAST - kitchen.room.width; // kitchen x = 0 (40¼″ east of the main room's west wall)
const KZ = Z_BATH + INT; // kitchen z = 0 (82½″)
const Z_KITCHEN_END = KZ + kitchen.room.depth; // where the kitchen's east wall ends (205¼″)
// end of the sink-wall countertop, taken from the kitchen's own layout (204½″)
const SINK_RUN = kitchen.baseRuns.find((r) => r.wall === 'east');
const Z_COUNTER_END = KZ + SINK_RUN.start + SINK_RUN.items.reduce((a, it) => a + it.width, 0) + SINK_RUN.extendRight;
// The living room beam lines up with the bedroom wing's end wall, likely the old back
// wall of the house: the vault runs from the kitchen's range wall to it.
const Z_BEAM = WING_LENGTH - OLD / 2; // ⚠ beam centerline (288″), placed from the photo

export default {
  id: 'house',
  kind: 'house',
  name: 'Whole house',
  height: HEIGHT, // ⚠ not on the plan; estimated from the photos (rooms can have a lower ceiling, see `ceilings`)

  palette: {
    ...kitchen.palette,
    doors: '#f8f7f3',
    tileFloor: '#cfccc6',
    ground: '#d3d8cf',
  },
  style: kitchen.style,

  // Default materials by kind of surface (keys from rooms/materials.js). The
  // bathroom is drawn with a tile floor, which isn't recorded yet.
  surfaces: {
    floor: ['oakFloor'],
  },

  // Floor/ceiling outline: bedroom wing + main building.
  footprint: [
    [0, 0, X_MAIN - OLD, WING_LENGTH],
    [X_MAIN - OLD, 0, WIDTH, LENGTH],
  ],

  // door: 'swing' | 'pocket' | 'bypass';  hinge = which jamb the hinges are on (plan direction)
  walls: [
    // ---- exterior ----
    {
      id: 'East wall', exterior: true, inside: 'south', x0: 0, z0: 0, x1: WIDTH, z1: EXT,
      notes: 'The gable end at the bathroom.',
      openings: [
        { id: 'W9', type: 'window', at: X_BATH + 2, width: 24, bottom: 48, height: 24, notes: 'Bathroom awning window, over the toilet, with the mini-split condenser below it outside. ⚠ Size, height and position estimated from the outside photo.' },
      ],
    },
    {
      id: 'Bedroom wing north wall', exterior: true, inside: 'east', x0: 0, z0: EXT, x1: EXT, z1: WING_LENGTH,
      notes: 'Windows are not on the plan; they come from the bedroom photo.',
      openings: [
        { id: 'W5', type: 'window', at: 16, width: 56, bottom: 42, height: 46, grid: [2, 1], notes: 'Pair of casements in bedroom 1. ⚠ Size, height and position estimated from the photo.' },
        { id: 'W6', type: 'window', at: 159, width: 56, bottom: 42, height: 46, grid: [2, 1], notes: 'Pair of casements in bedroom 2. ⚠ Size, height and position estimated from the photo.' },
      ],
    },
    {
      id: 'Bedroom wing west wall', exterior: true, inside: 'north', x0: EXT, z0: WING_LENGTH - EXT, x1: X_MAIN - OLD, z1: WING_LENGTH,
      openings: [
        { id: 'W7', type: 'window', at: 16, width: 24, bottom: 36, height: 46, notes: 'Textured (obscure) glass, near the north corner. ⚠ Size, height and position estimated from the photo.' },
      ],
    },
    {
      id: 'Main north wall (entry)', exterior: true, inside: 'east', x0: X_MAIN - OLD, z0: WING_LENGTH, x1: X_MAIN, z1: LENGTH,
      openings: [
        { id: 'ENTRY', type: 'door', door: 'swing', hinge: 'south', at: 7, width: 36, height: 80, open: 70, notes: 'Swings in, hinged on the west jamb. ⚠ Position scaled from the drawing.' },
      ],
    },
    {
      id: 'West wall', exterior: true, inside: 'north', x0: X_MAIN, z0: Z_SOUTH, x1: X_EAST, z1: LENGTH,
      notes: 'The 15′-5″ R.O. dimension is written along this wall.',
      openings: [
        { id: 'W3', type: 'window', at: 30, width: 33, bottom: 19, height: 60, materials: ['kolbeWindow'], notes: 'Tall window, north side. ⚠ Size, height and position estimated from the living room photo.' },
        { id: 'W4', type: 'window', at: 137, width: 28, bottom: 23, height: 56, materials: ['kolbeWindow'], notes: 'Tall window, south side. ⚠ Size, height and position estimated from the living room photo.' },
      ],
    },
    {
      id: 'South wall', exterior: true, inside: 'west', x0: X_EAST, z0: EXT, x1: WIDTH, z1: LENGTH,
      openings: [
        { id: 'SLIDER', type: 'door', door: 'slider', at: Z_COUNTER_END + 1.5 - EXT, width: 72, height: 80, casing: false, materials: ['kolbeSlider'],
          notes: '6′ sliding glass door, starting 1½″ past the end of the kitchen countertop. No inside trim drawn (there is no room for casing beside the counter). ⚠ Height assumed to be the standard 6′-8″.' },
        { id: 'W8', type: 'window', at: 340, width: 27, bottom: 21, height: 58, notes: 'Living room. ⚠ Size, height and position estimated from the photo; the sill was hidden.' },
      ],
    },

    // ---- interior ----
    {
      id: 'Bedroom wing / main room wall', inside: 'east', x0: X_MAIN - OLD, z0: EXT, x1: X_MAIN, z1: WING_LENGTH,
      notes: 'Probably the original outside wall, given its thickness on the plan. Steel beam BEAM-1 runs along its top from the bedroom 1 door into the utility room.',
      openings: [
        { id: 'D-BR1', type: 'door', door: 'pocket', at: D_BR1 - EXT, width: 30, height: HEIGHT - 8, casing: false,
          notes: 'Into bedroom 1. The opening goes up to the underside of the steel beam; jambs are bare wood in the photo. ⚠ Position scaled from the drawing; door type from the plan.' },
        { id: 'D-BR2', type: 'door', door: 'pocket', at: 245 - EXT, width: 30, height: 80, notes: 'Pocket door into bedroom 2. ⚠ Position scaled from the drawing.' },
      ],
    },
    {
      id: 'Bathroom north wall', inside: 'east', x0: X_BATH - INT, z0: EXT, x1: X_BATH, z1: Z_BATH,
      openings: [{ id: 'D-BATH', type: 'door', door: 'pocket', at: 40, width: 28, height: 80, notes: 'Pocket door from the hall. ⚠ Width and position scaled from the drawing.' }],
    },
    { id: 'Bathroom / kitchen wall', inside: 'south', x0: KX, z0: Z_BATH, x1: X_EAST, z1: KZ,
      notes: 'The kitchen’s east (range) wall. Ends behind the tall cabinet, leaving a walkway from the kitchen to the hall. ⚠ The kitchen plan draws this wall continuing further north.' },
    {
      id: 'Utility room front', inside: 'south', x0: X_MAIN, z0: Z_CLOSET, x1: X_BATH - INT, z1: Z_CLOSET + INT,
      openings: [{ id: 'D-LAUNDRY', type: 'door', door: 'bypass', at: 2, width: 72, height: 80, notes: 'Sliding bypass doors. ⚠ Width scaled from the drawing.' }],
    },
  ],

  // Rooms: inside faces of their walls. Labels show their size. Each room also gets
  // its own entry in the room menu unless it has menu: false; `views` sets its camera
  // presets (same format as the kitchen's); `with` lists rooms its view also shows.
  rooms: [
    // no wall between the bedrooms, so each one's view shows both (`with`)
    { name: 'Bedroom 1', x0: EXT, z0: EXT, x1: X_MAIN - OLD, z1: DIVIDER, with: ['Bedroom 2'], notes: 'Open to bedroom 2; no wall between them.',
      views: { eye: { pos: [EXT + 22, 76, EXT + 10], target: [EXT + 85, 38, WING_LENGTH - EXT] } } }, // like the photo: from the bedroom 1 end, looking toward bedroom 2
    { name: 'Bedroom 2', x0: EXT, z0: DIVIDER, x1: X_MAIN - OLD, z1: WING_LENGTH - EXT, with: ['Bedroom 1'], notes: 'Open to bedroom 1; no wall between them.',
      views: { eye: { pos: [X_MAIN - OLD - 14, 64, WING_LENGTH - EXT - 12], target: [EXT + 40, 44, EXT] } } }, // from the bedroom 2 end, looking back
    { name: 'Bathroom', x0: X_BATH, z0: EXT, x1: X_EAST, z1: Z_BATH, floor: 'tile' },
    { name: 'Utility room', x0: X_MAIN, z0: EXT, x1: X_BATH - INT, z1: Z_CLOSET,
      views: { eye: { pos: [X_MAIN + 48, 56, 150], target: [X_MAIN + 48, 42, EXT] } } }, // from across the hall, looking in
    { name: 'Hall', x0: X_MAIN, z0: Z_CLOSET + INT, x1: X_BATH - INT, z1: Z_BATH,
      views: { eye: { pos: [X_MAIN + 8, 64, Z_BATH - 10], target: [X_BATH, 44, Z_BATH - 20] } } },
    { name: 'Walkway', x0: X_MAIN, z0: Z_BATH, x1: KX, z1: Z_KITCHEN_END, label: false, menu: false },
    { name: 'Kitchen', x0: KX, z0: KZ, x1: X_EAST, z1: Z_KITCHEN_END, notes: 'Detailed in the Kitchen view.', menu: false }, // has its own detailed view
    { name: 'Living area', x0: X_MAIN, z0: Z_KITCHEN_END, x1: X_EAST, z1: Z_SOUTH, notes: 'Measured from the end of the kitchen’s south (sink) wall to the west wall.',
      views: { eye: { pos: [X_MAIN + 70, 60, Z_KITCHEN_END + 2], target: [X_MAIN + 76, 76, Z_SOUTH] } } }, // like the photo: from the kitchen end
  ],

  include: [{ config: kitchen, x: KX, z: KZ, labels: false }],

  // Placed like the kitchen's free-standing items: x/z = north-west corner of the
  // footprint, width across the front, front facing `facing`. 'box' items are
  // world-aligned (width east–west, depth north–south).
  fixtures: [
    // bathroom ⚠ sizes and positions are placeholders until the interior photos
    { id: 'WC', type: 'Toilet', kind: 'toilet', x: X_BATH + 5, z: EXT, width: 19, depth: 28, height: 30, facing: 'south' },
    { id: 'VANITY', type: 'Vanity', kind: 'vanity', x: X_EAST - 36 - 21, z: EXT, width: 21, depth: 19, height: 32.5, facing: 'south' },
    { id: 'SHOWER', type: 'Neo-angle shower', kind: 'cornerShower', corner: 'north-east', x: X_EAST, z: EXT, size: 36 },
    { id: 'LINEN', type: 'Bathroom cabinet', kind: 'cabinet', x: X_EAST - 18, z: EXT + 38, width: 32, depth: 18, height: 84, facing: 'west', doors: 2,
      notes: '⚠ Drawn along the south wall, west of the shower; what it is and how tall are unknown.' },
    // utility room, against the top wall of the plan
    { id: 'W/D', type: 'Stacked washer + dryer', kind: 'laundry', x: X_MAIN + 1, z: EXT + 0.5, width: 27, depth: 30, height: 77, facing: 'south' },
    { id: 'ELEC', type: 'Electrical panel', kind: 'box', x: X_MAIN + 38, z: EXT, width: 14.25, depth: 4, height: 30, bottom: 48, color: '#a7abaf', metal: true, notes: '⚠ Size and height are typical, not measured.' },
    { id: 'H2O', type: 'Tankless water heater', code: 'Takagi T-H3S-DV-P', kind: 'box', x: X_BATH - INT - 24, z: EXT, width: 17.75, depth: 11.25, height: 24.88, bottom: 42, color: '#f1f1ee',
      notes: '17¾″ W × 24⅞″ H × 11¼″ D (from the plan). ⚠ Mounting height assumed.' },
    // heating / cooling: the indoor unit hangs on the framing above the living room
    // beam, facing the kitchen
    { id: 'A/C', type: 'Ductless mini-split (indoor unit)', code: 'Blueridge', kind: 'box', x: (X_MAIN + X_EAST) / 2 - 18.8, z: Z_BEAM - 2 - 9.8, width: 37.6, depth: 9.8, height: 11.8, bottom: LIVING_CEILING + 8, color: '#f6f6f4',
      notes: 'Mounted above beam BEAM-2 under the peak of the vault, blowing into the kitchen. ⚠ Size is a typical 18,000 BTU Blueridge unit, judged from the photo.' },
    // outside, hung on wall brackets under the bathroom window (W9), fan facing out
    { id: 'CONDENSER', type: 'Mini-split condenser (outside)', code: 'Blueridge', kind: 'box', x: X_BATH + 26 - 34, z: -13, width: 34, depth: 13, height: 28, bottom: 0, color: '#eeeeea', grille: 'north',
      notes: 'On wall brackets below the bathroom window, lined up with its east edge. Hung at about floor level (the model has no crawl space, so it sits at the ground line). ⚠ Size is typical for a Blueridge outdoor unit, not measured.' },
  ],

  // Structural steel. from/to = ends of the beam's centerline [x, z]; the top sits at
  // the ceiling. Walls it runs inside are cut away around it, so it shows.
  beams: [
    {
      id: 'BEAM-1', type: 'Steel beam (W-flange)', from: [X_MAIN - OLD / 2, EXT], to: [X_MAIN - OLD / 2, D_BR1 + 30 + 20], depth: 8, flange: 4, materials: ['steelW8'],
      notes: 'Over the bedroom 1 door, running along the old outside wall north into the utility room. Exposed, top at the ceiling. ⚠ Where it ends is estimated: about 20″ past the door in the photo, and at the outside wall in the utility room.',
    },
    {
      id: 'BEAM-2', type: 'Steel beam (W-flange)', from: [X_MAIN - 3, Z_BEAM], to: [X_EAST + 3, Z_BEAM], depth: 8, flange: 4, bottom: LIVING_CEILING, materials: ['steelW8'],
      notes: 'Spans the whole width of the living room where the vaulted ceiling ends; its bottom is flush with the flat living room ceiling. ⚠ Position along the room estimated from the photo.',
    },
  ],

  // Rooms whose flat ceiling is lower than the wall height (x/z box, inches).
  ceilings: [
    { id: 'Living room ceiling', x0: X_MAIN, z0: Z_BEAM + 2, x1: X_EAST, z1: Z_SOUTH, height: LIVING_CEILING,
      notes: '⚠ About 7′, flush with the underside of beam BEAM-2; estimated from the living room photo.' },
  ],

  // Vaulted ceilings (scissor trusses). The ceiling rises from the flat ceiling height at
  // x0 and x1 to `peak` along a ridge down the middle (plan north–south). `ends` are the
  // walls closing the vault: z = where the wall starts, t = thickness, base = its bottom.
  vaults: [
    {
      id: 'Kitchen vault', type: 'Vaulted ceiling (scissor trusses)', x0: X_MAIN, x1: X_EAST, z0: KZ, z1: Z_BEAM - 2, peak: PEAK,
      ends: [{ z: KZ - INT, t: INT, base: HEIGHT }, { z: Z_BEAM - 2, t: 4, base: LIVING_CEILING + 8 }],
      notes: '9′-0″ at the peak. Runs from the kitchen’s range wall to the living room beam. ⚠ Where it starts at the range-wall end is assumed.',
    },
  ],

  // Dimension lines on the ground outside the walls, as written on the plan.
  dimensions: [
    { from: [-30, 0], to: [-30, WING_LENGTH], text: '24′-3″', notes: 'Bedroom wing, outside faces.' },
    { from: [-60, 0], to: [-60, LENGTH], text: '34′-3″', notes: 'Overall length, outside faces.' },
    { from: [X_MAIN, LENGTH + 30], to: [X_EAST, LENGTH + 30], text: '15′-5″ R.O.', notes: 'Main room width. R.O. = rough opening (framing to framing).' },
    { from: [X_BATH, -30], to: [X_EAST, -30], text: '7′-0″', notes: 'Bathroom width. ⚠ The drawing itself scales closer to 8′-5″.' },
    { from: [WIDTH + 30, EXT], to: [WIDTH + 30, Z_BATH], text: '6′-0″', notes: 'Bathroom depth.' },
    { from: [0, -60], to: [WIDTH, -60], text: `≈ ${fmtFt(WIDTH)} (est.)`, estimate: true, notes: '⚠ Not on the plan: adds the measured 15′-5″ to the bedroom wing width estimated from a photo and assumed wall thicknesses.' },
  ],

  views: {
    eye: { pos: [215, 64, 395], target: [195, 42, 120] },
  },
};
