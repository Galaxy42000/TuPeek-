// ============================================================================
//  WHOLE HOUSE — every number in this file is in INCHES.
//  Source: hand-drawn plan view (blueprint sketch). Dimensions written on it:
//    34′-3″  overall length, north–south
//    24′-3″  bedroom wing length, north–south
//    15′-5″ R.O.  main room width, east–west
//    7′-0″ × 6′-0″  bathroom
//    Takagi T-H3S-DV-P water heater, 11¼″ × 17¾″ × 24⅞″
//  Anything marked ⚠ is not written on the plan: it was scaled off the drawing
//  or assumed, and should be measured.
//
//  How positions work
//  ------------------
//  • North is the top of the plan (bathroom end). x = inches east of the
//    building's west outside face, z = inches south of its north outside face.
//  • Walls are boxes: x0–x1 by z0–z1. `inside` names the side the (main) room is
//    on, which is the face that gets the window/door trim.
//  • A door's or window's `at` is its distance from the wall's north end (walls
//    running north–south) or west end (walls running east–west).
//  • The kitchen is built from rooms/kitchen.js and placed unchanged; its window
//    is carried over onto the east wall automatically.
// ============================================================================

import kitchen from './kitchen.js';
import { fmtFt } from '../js/units.js';

const EXT = 6; // ⚠ exterior wall thickness
const INT = 4.5; // interior partition thickness
const OLD = 6; // ⚠ wall between the bedroom wing and the main room

const LENGTH = 411; // 34′-3″ outside face to outside face
const WING_LENGTH = 291; // 24′-3″
const WING_WIDTH = 88; // ⚠ inside width of the bedroom wing, scaled from the drawing (no dimension)
const MAIN_WIDTH = 185; // 15′-5″ R.O.
const BATH_WIDTH = 84; // 7′-0″
const BATH_DEPTH = 72; // 6′-0″

const X_MAIN = EXT + WING_WIDTH + OLD; // west face of the main room (100)
const X_EAST = X_MAIN + MAIN_WIDTH; // east wall, inside face (285)
const WIDTH = X_EAST + EXT; // overall width (291) ⚠ follows from the assumptions above
const Z_SOUTH = LENGTH - EXT; // south wall, inside face (405)

const X_BATH = X_EAST - BATH_WIDTH; // bathroom's west inside face (201)
const Z_BATH = EXT + BATH_DEPTH; // bathroom's south inside face (78)
const Z_CLOSET = 37; // ⚠ front of the laundry closet (scaled)
const DIVIDER = 154; // ⚠ wall between the two bedrooms (scaled)

// The kitchen's east wall is the building's east wall, and its north wall is the
// bathroom's south wall.
const KX = X_EAST - kitchen.room.width; // kitchen x = 0 (40¼″ east of the main room's west wall)
const KZ = Z_BATH + INT; // kitchen z = 0 (82½″)
const Z_KITCHEN_END = KZ + kitchen.room.depth; // where the kitchen's east wall ends (205¼″)

export default {
  id: 'house',
  kind: 'house',
  name: 'Whole house',
  height: 96, // ⚠ not on the plan; same 8′ assumption as the kitchen

  palette: {
    ...kitchen.palette,
    doors: '#f8f7f3',
    tileFloor: '#cfccc6',
    ground: '#d3d8cf',
  },
  style: kitchen.style,

  // Floor/ceiling outline: bedroom wing + main building.
  footprint: [
    [0, 0, X_MAIN - OLD, WING_LENGTH],
    [X_MAIN - OLD, 0, WIDTH, LENGTH],
  ],

  // door: 'swing' | 'pocket' | 'bypass';  hinge = which jamb the hinges are on (compass)
  walls: [
    // ---- exterior ----
    { id: 'North wall', exterior: true, inside: 'south', x0: 0, z0: 0, x1: WIDTH, z1: EXT },
    { id: 'Bedroom wing west wall', exterior: true, inside: 'east', x0: 0, z0: EXT, x1: EXT, z1: WING_LENGTH,
      notes: '⚠ No windows are drawn in the bedroom wing.' },
    { id: 'Bedroom wing south wall', exterior: true, inside: 'north', x0: EXT, z0: WING_LENGTH - EXT, x1: X_MAIN - OLD, z1: WING_LENGTH },
    {
      id: 'Main west wall (entry)', exterior: true, inside: 'east', x0: X_MAIN - OLD, z0: WING_LENGTH, x1: X_MAIN, z1: LENGTH,
      openings: [
        { id: 'ENTRY', type: 'door', door: 'swing', hinge: 'south', at: 7, width: 36, height: 80, open: 70, notes: 'Swings in, hinged on the south jamb. ⚠ Position scaled from the drawing.' },
        { id: 'W2', type: 'window', at: 49, width: 20, bottom: 36, height: 48, notes: '⚠ Narrow window drawn just south of the entry door; size and height are guesses.' },
      ],
    },
    {
      id: 'South wall', exterior: true, inside: 'north', x0: X_MAIN, z0: Z_SOUTH, x1: X_EAST, z1: LENGTH,
      notes: 'The 15′-5″ R.O. dimension is written along this wall.',
      openings: [
        { id: 'W3', type: 'window', at: 34 - 15, width: 30, bottom: 36, height: 48, grid: [1, 2], notes: '⚠ Centered about 34″ from the west wall; size and height are guesses.' },
        { id: 'W4', type: 'window', at: MAIN_WIDTH - 34 - 15, width: 30, bottom: 36, height: 48, grid: [1, 2], notes: '⚠ Centered about 34″ from the east wall; size and height are guesses.' },
      ],
    },
    { id: 'East wall', exterior: true, inside: 'west', x0: X_EAST, z0: EXT, x1: WIDTH, z1: LENGTH },

    // ---- interior ----
    {
      id: 'Bedroom wing / main room wall', inside: 'east', x0: X_MAIN - OLD, z0: EXT, x1: X_MAIN, z1: WING_LENGTH,
      notes: 'Probably the original outside wall, given its thickness on the plan.',
      openings: [
        { id: 'D-BR1', type: 'door', door: 'pocket', at: 85.5 - EXT, width: 30, height: 80, notes: 'Pocket door into bedroom 1. ⚠ Position scaled from the drawing.' },
        { id: 'D-BR2', type: 'door', door: 'pocket', at: 245 - EXT, width: 30, height: 80, notes: 'Pocket door into bedroom 2. ⚠ Position scaled from the drawing.' },
      ],
    },
    { id: 'Bedroom divider', inside: 'south', x0: EXT, z0: DIVIDER, x1: X_MAIN - OLD, z1: DIVIDER + INT },
    {
      id: 'Bathroom west wall', inside: 'east', x0: X_BATH - INT, z0: EXT, x1: X_BATH, z1: Z_BATH,
      openings: [{ id: 'D-BATH', type: 'door', door: 'pocket', at: 40, width: 28, height: 80, notes: 'Pocket door from the hall. ⚠ Width and position scaled from the drawing.' }],
    },
    { id: 'Bathroom / kitchen wall', inside: 'south', x0: KX, z0: Z_BATH, x1: X_EAST, z1: KZ,
      notes: 'The kitchen’s north wall. Ends behind the tall cabinet, leaving a walkway from the kitchen to the hall. ⚠ The kitchen plan draws this wall continuing further west.' },
    {
      id: 'Laundry closet front', inside: 'south', x0: X_MAIN, z0: Z_CLOSET, x1: X_BATH - INT, z1: Z_CLOSET + INT,
      openings: [{ id: 'D-LAUNDRY', type: 'door', door: 'bypass', at: 2, width: 72, height: 80, notes: 'Sliding bypass doors. ⚠ Width scaled from the drawing.' }],
    },
  ],

  // Rooms: inside faces of their walls. Labels show their size.
  rooms: [
    { name: 'Bedroom 1', x0: EXT, z0: EXT, x1: X_MAIN - OLD, z1: DIVIDER },
    { name: 'Bedroom 2', x0: EXT, z0: DIVIDER + INT, x1: X_MAIN - OLD, z1: WING_LENGTH - EXT },
    { name: 'Bathroom', x0: X_BATH, z0: EXT, x1: X_EAST, z1: Z_BATH, floor: 'tile' },
    { name: 'Laundry closet', x0: X_MAIN, z0: EXT, x1: X_BATH - INT, z1: Z_CLOSET },
    { name: 'Hall', x0: X_MAIN, z0: Z_CLOSET + INT, x1: X_BATH - INT, z1: Z_BATH },
    { name: 'Walkway', x0: X_MAIN, z0: Z_BATH, x1: KX, z1: Z_KITCHEN_END, label: false },
    { name: 'Kitchen', x0: KX, z0: KZ, x1: X_EAST, z1: Z_KITCHEN_END, notes: 'Detailed in the Kitchen view.' },
    { name: 'Living area', x0: X_MAIN, z0: Z_KITCHEN_END, x1: X_EAST, z1: Z_SOUTH, notes: 'Measured from the end of the kitchen’s east wall to the south wall.' },
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
      notes: '⚠ Drawn along the east wall south of the shower; what it is and how tall are unknown.' },
    // laundry closet, on the north wall
    { id: 'W/D', type: 'Stacked washer + dryer', kind: 'laundry', x: X_MAIN + 1, z: EXT + 0.5, width: 27, depth: 30, height: 77, facing: 'south' },
    { id: 'ELEC', type: 'Electrical panel', kind: 'box', x: X_MAIN + 38, z: EXT, width: 14.25, depth: 4, height: 30, bottom: 48, color: '#a7abaf', metal: true, notes: '⚠ Size and height are typical, not measured.' },
    { id: 'H2O', type: 'Tankless water heater', code: 'Takagi T-H3S-DV-P', kind: 'box', x: X_BATH - INT - 24, z: EXT, width: 17.75, depth: 11.25, height: 24.88, bottom: 42, color: '#f1f1ee',
      notes: '17¾″ W × 24⅞″ H × 11¼″ D (from the plan). ⚠ Mounting height assumed.' },
    // heating / cooling
    { id: 'A/C', type: 'Ductless mini-split (indoor unit)', kind: 'box', x: X_EAST - 8, z: 290, width: 8, depth: 32, height: 11, bottom: 82, color: '#f6f6f4', notes: '⚠ Size and height are typical, not measured.' },
    { id: 'CONDENSER', type: 'Mini-split condenser (outside)', kind: 'box', x: WIDTH + 3, z: 291, width: 13, depth: 31, height: 22, bottom: 3, color: '#d9dbd9', notes: '⚠ Size is typical, not measured.' },
    { id: 'PAD', type: 'Equipment pad', kind: 'box', x: WIDTH + 1, z: 289, width: 17, depth: 35, height: 3.6, bottom: -0.6, color: '#b9b8b2', label: false },
  ],

  // Dimension lines on the ground outside the walls, as written on the plan.
  dimensions: [
    { from: [-30, 0], to: [-30, WING_LENGTH], text: '24′-3″', notes: 'Bedroom wing, outside faces.' },
    { from: [-60, 0], to: [-60, LENGTH], text: '34′-3″', notes: 'Overall length, outside faces.' },
    { from: [X_MAIN, LENGTH + 30], to: [X_EAST, LENGTH + 30], text: '15′-5″ R.O.', notes: 'Main room width. R.O. = rough opening (framing to framing).' },
    { from: [X_BATH, -30], to: [X_EAST, -30], text: '7′-0″', notes: 'Bathroom width. ⚠ The drawing itself scales closer to 8′-5″.' },
    { from: [WIDTH + 30, EXT], to: [WIDTH + 30, Z_BATH], text: '6′-0″', notes: 'Bathroom depth.' },
    { from: [0, -60], to: [WIDTH, -60], text: `≈ ${fmtFt(WIDTH)} (est.)`, estimate: true, notes: '⚠ Not on the plan: adds the measured 15′-5″ to the scaled bedroom wing width and assumed wall thicknesses.' },
  ],

  views: {
    eye: { pos: [215, 64, 395], target: [195, 42, 120] },
  },
};
