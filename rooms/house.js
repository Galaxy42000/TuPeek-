// ============================================================================
//  WHOLE HOUSE — every number in this file is in INCHES.
//  Source: hand-drawn plan view (blueprint sketch). Dimensions written on it:
//    34′-3″  overall length (top to bottom of the plan; true east–west)
//    24′-3″  bedroom wing length, same direction
//    15′-5″ R.O.  main room width (left to right; true north–south)
//    7′-0″ × 6′-0″  bathroom
//    Takagi T-H3S-DV-P water heater, 11¼″ × 17¾″ × 24⅞″ (the photos show an EcoSmart
//    electric tankless heater installed instead)
//  Interior photos: bedroom 1 looking into bedroom 2 (no wall between them,
//    steel beam over the bedroom 1 door, bedroom wing windows); kitchen looking
//    into the living room (vaulted kitchen ceiling on scissor trusses with a 9′
//    peak, steel beam across the living room, its windows, the mini-split);
//    the kitchen without cabinets (4′ × 4′ window, 6′ sliding glass door, 8′ walls);
//    outside at the bathroom end (bathroom window with the condenser under it);
//    the deck framing outside the sliding door; the outside all round (vinyl siding,
//    Clipstone skirt, Kolbe windows, roof, entry porch); the bathroom (DreamLine
//    shower, tile, LED mirror, sloped ceiling).
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

// Deck outside the sliding door, from the two framing photos (all ⚠ estimated from them):
// an upper landing one step down from the floor, 12′ along the house × 10′ out (from
// the owner), and a lower deck along its north and outer sides with a 45° corner,
// ending a little short of the landing's south end.
const DECK_X = WIDTH + 3; // the deck's ledger, against the stone skirt's cap
const UPPER = { z0: 180, z1: 180 + 144, out: 120 }; // 12′ × 10′; ⚠ where it starts along the wall is from the photos
const LOWER = { z0: 110, z1: 290, out: 144, clip: 45 };

// Entry porch (in the recess by the front door): a landing one board below the door
// sill, and a narrower step in front that stops short of the landing's far end.
// ⚠ Sizes estimated from the photos.
const PORCH = { width: 72, out: 48, step: 12, stepWidth: 58 };
// The living room beam lines up with the bedroom wing's end wall, likely the old back
// wall of the house: the vault runs from the kitchen's range wall to it.
const Z_BEAM = WING_LENGTH - OLD / 2; // ⚠ beam centerline (288″), placed from the photo

export default {
  id: 'house',
  kind: 'house',
  name: 'Whole house',
  height: HEIGHT, // ⚠ not on the plan; estimated from the photos (rooms can have a lower ceiling, see `ceilings`)

  // ⚠ ground level outside, relative to the floor inside (the stone skirt), estimated
  grade: -28,

  palette: {
    ...kitchen.palette,
    // bathroom vanity and linen cabinet: not known yet, kept painted white
    cabinets: '#f1efe9',
    cabinetGrain: false,
    doors: '#f8f7f3',
    tileFloor: '#a7a8a6', // gray marble-look porcelain
    ground: '#d3d8cf',
    siding: '#7a8591',
    stone: '#6e737c',
    shingles: '#45474b',
  },
  style: kitchen.style,

  // Default materials by kind of surface (keys from rooms/materials.js). The
  // bathroom is drawn with a tile floor, which isn't recorded yet.
  surfaces: {
    floor: ['oakFloor'],
    tileFloor: ['porcelainFloorTile', 'ditraHeat'],
    windows: ['kolbeWindow', 'cherrySill', 'drywallReturns'],
    siding: ['vinylSiding'],
    stone: ['clipstone'],
    roof: ['roofShingles'],
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
        { id: 'W11', type: 'window', at: 24, width: 52, bottom: 64, height: 20, notes: 'Wide awning window high in bedroom 1’s east end. ⚠ Size, height and position estimated from the outside photos.' },
        { id: 'W9', type: 'window', at: X_BATH + 1, width: 20, bottom: 48, height: 24, notes: 'Bathroom awning window, over the toilet, with the mini-split condenser below it outside. ⚠ Size, height and position estimated from the outside photo.' },
      ],
    },
    {
      id: 'Bedroom wing north wall', exterior: true, inside: 'east', x0: 0, z0: EXT, x1: EXT, z1: WING_LENGTH,
      notes: 'Windows are not on the plan; they come from the bedroom photo.',
      openings: [
        { id: 'W5', type: 'window', at: 28, width: 84, bottom: 26, height: 58, grid: [3, 1], notes: 'Three-panel sliding window in bedroom 1. ⚠ Size, height and position estimated from the outside photos.' },
        { id: 'W6', type: 'window', at: 187, width: 70, bottom: 26, height: 58, grid: [2, 1], notes: 'Two-panel sliding window in bedroom 2. ⚠ Size, height and position estimated from the outside photos.' },
      ],
    },
    {
      id: 'Bedroom wing west wall', exterior: true, inside: 'north', x0: EXT, z0: WING_LENGTH - EXT, x1: X_MAIN - OLD, z1: WING_LENGTH,
      openings: [
        { id: 'W7', type: 'window', at: 4, width: 18, bottom: 34, height: 50, notes: 'Narrow window beside the entry porch, near the north corner. ⚠ Size, height and position estimated from the photos.' },
      ],
    },
    {
      id: 'Main north wall (entry)', exterior: true, inside: 'east', x0: X_MAIN - OLD, z0: WING_LENGTH, x1: X_MAIN, z1: LENGTH,
      openings: [
        { id: 'ENTRY', type: 'door', door: 'swing', hinge: 'south', at: 7, width: 36, height: 80, open: 0, lites: 5, color: '#c4212b', materials: ['reebEntryDoor'],
          notes: 'Red 5-lite fiberglass entry door, 36″ × 80″. Swings in, hinged on the west jamb; shown closed. ⚠ Position scaled from the drawing.' },
      ],
    },
    {
      id: 'West wall', exterior: true, inside: 'north', x0: X_MAIN, z0: Z_SOUTH, x1: X_EAST, z1: LENGTH,
      notes: 'The 15′-5″ R.O. dimension is written along this wall.',
      openings: [
        { id: 'W3', type: 'window', at: 30, width: 33, bottom: 19, height: 60, materials: ['kolbeWindow', 'cherrySill', 'drywallReturns'], notes: 'Tall window, north side. ⚠ Size, height and position estimated from the living room photo.' },
        { id: 'W4', type: 'window', at: 137, width: 28, bottom: 23, height: 56, materials: ['kolbeWindow', 'cherrySill', 'drywallReturns'], notes: 'Tall window, south side. ⚠ Size, height and position estimated from the living room photo.' },
      ],
    },
    {
      id: 'South wall', exterior: true, inside: 'west', x0: X_EAST, z0: EXT, x1: WIDTH, z1: LENGTH,
      openings: [
        { id: 'W10', type: 'window', at: 41, width: 23, bottom: 53, height: 27, notes: 'Small bathroom awning window, just past the shower. Its top lines up with the sliding door’s. ⚠ Size, height and position estimated from the photos.' },
        { id: 'SLIDER', type: 'door', door: 'slider', at: Z_COUNTER_END + 1.5 - EXT, width: 72, height: 80, casing: false, materials: ['kolbeSlider'],
          notes: '6′ sliding glass door, starting 1½″ past the end of the kitchen countertop. No inside trim drawn (there is no room for casing beside the counter). ⚠ Height assumed to be the standard 6′-8″.' },
        { id: 'W8', type: 'window', at: 341 - EXT, width: 32, bottom: 16, height: 64, notes: 'Living room. Its top lines up with the sliding door’s. ⚠ Size, height and position estimated from the outside photos.' },
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
      // not built yet: full-width louvered bifolds open up the whole closet (panel, tank,
      // washer/dryer) at once, and the louvers let the washer/dryer and heater breathe
      openings: [{ id: 'D-UTILITY', type: 'door', door: 'bifold', at: 4, width: 88, height: 80, leaves: 4, louvered: true, open: 70, materials: ['louveredBifold'],
        notes: 'Proposed (not built yet): two pairs of 22″ louvered bifold doors in an 88″ opening, folding to each side, shown open. Opening the whole front gives clear access to the washer/dryer and the 30″-wide working space code requires in front of the electrical panel; the louvers vent the washer/dryer.' }],
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
    // bathroom, from the bathroom photo: shower in the corner of the gable wall and the
    // long outside wall, W10 just past it, the vanity's plumbing and LED mirror beside it
    { id: 'WC', type: 'Toilet', kind: 'toilet', x: X_BATH + 2, z: EXT, width: 19, depth: 28, height: 30, facing: 'south', notes: '⚠ Not in the photo; position from the sketch.' },
    { id: 'VANITY', type: 'Vanity', kind: 'vanity', x: X_EAST - 38 - 24, z: EXT, width: 24, depth: 19, height: 32.5, facing: 'south', mirror: 'led', mirrorWidth: 22, mirrorHeight: 32, mirrorBottom: 44,
      materials: ['ledMirror'], notes: 'Not installed yet in the photo (plumbing stubbed out); LED-lit mirror above it about 4″ from the shower. ⚠ Vanity size assumed.' },
    { id: 'SHOWER', type: 'Neo-angle shower (frameless)', code: 'DreamLine', kind: 'cornerShower', corner: 'north-east', x: X_EAST, z: EXT, size: 36, height: 72, tile: 90,
      niches: [{ wall: 'x', at: 14, bottom: 52, width: 12, height: 24 }, { wall: 'x', at: 22, bottom: 22, width: 6, height: 6 }],
      materials: ['dreamlineShower', 'showerTile'],
      notes: 'Frameless glass: two short returns and a hinged door on the angled front, on a white neo-angle base. White 12″ × 24″ tile on both walls with two niches on the outside wall. ⚠ Base size (36″) and glass height (72″) assumed.' },
    // utility room, against the top wall of the plan
    { id: 'W/D', type: 'Stacked all-in-one washer + dryer', kind: 'laundry', unit: true, x: X_BATH - INT - 27.5, z: EXT + 0.5, width: 27, depth: 30, height: 77, facing: 'south',
      notes: 'One stacked unit (washer below, dryer above), on the right side of the utility room against the bathroom wall. ⚠ Size typical, not measured.' },
    // utility room back wall, from the utility room photo (left to right): main panel,
    // EcoSmart tankless heater with a copper manifold below it, whole-house filters near
    // the floor, and the well pressure tank next to the washer/dryer ⚠ positions scaled from the photo
    { id: 'ELEC', type: 'Main electrical panel (flush mount)', code: 'Square D QO, 200 A', kind: 'box', x: 120.25, z: EXT, width: 14.5, depth: 0.4, height: 36, bottom: 29, color: '#a7abaf', metal: true, materials: ['squareDPanel'],
      notes: 'Square D QO 200-amp main breaker panel, mounted flush: the box is set into the wall framing, so only the cover shows. ⚠ Size and height scaled from the photo.' },
    { id: 'H2O', type: 'Electric tankless water heater', code: 'EcoSmart', kind: 'box', x: 143, z: EXT, width: 17, depth: 4, height: 16, bottom: 58, color: '#d6d8d8', materials: ['ecosmartHeater'],
      notes: 'EcoSmart electric tankless heater (the plan listed a Takagi gas unit; the photo shows the EcoSmart installed). ⚠ Size typical for the EcoSmart ECO line; model not recorded.' },
    { id: 'MANIFOLD', type: 'Copper water manifold', kind: 'box', x: 151.75, z: EXT, width: 1.5, depth: 2, height: 22, bottom: 28, color: '#b87333', metal: true, label: false },
    { id: 'FILTERS', type: 'Whole-house water filters', kind: 'box', x: 138.5, z: EXT, width: 10, depth: 5, height: 14, bottom: 10, color: '#c9d6ec',
      notes: 'Two filter housings on the incoming water line. ⚠ Size scaled from the photo.' },
    { id: 'WASHER BOX', type: 'Washer outlet box (shut-off valves)', kind: 'box', x: 172, z: EXT, width: 9, depth: 0.75, height: 10, bottom: 33, color: '#f4f4f2',
      notes: 'Recessed box with the hot and cold shut-off valves (and drain) for the washer/dryer, just right of the pressure tank, behind the washer/dryer. ⚠ Size typical; position scaled from the utility room photo.' },
    { id: 'TANK', type: 'Well pressure tank', kind: 'tank', x: X_BATH - INT - 27.5 - 2 - 16, z: EXT + 2, width: 16, depth: 16, height: 37, color: '#2f6fb7', materials: ['pressureTank'],
      notes: '25-gallon blue pressure tank on the floor, beside the washer/dryer, with its pressure switch and fittings. ⚠ Size typical for a 25-gallon tank.' },
    // heating / cooling: the indoor unit hangs on the framing above the living room
    // beam, facing the kitchen
    { id: 'A/C', type: 'Ductless mini-split (indoor unit)', code: 'Blueridge', kind: 'box', x: (X_MAIN + X_EAST) / 2 - 18.8, z: Z_BEAM - 2 - 9.8, width: 37.6, depth: 9.8, height: 11.8, bottom: LIVING_CEILING + 8, color: '#f6f6f4',
      notes: 'Mounted above beam BEAM-2 under the peak of the vault, blowing into the kitchen. ⚠ Size is a typical 18,000 BTU Blueridge unit, judged from the photo.' },
    // outside on the bathroom end wall: electric meter, the condenser on brackets under the
    // bathroom window (W9, fan facing out), and a disconnect box ⚠ sizes typical, from the photos
    { id: 'METER', type: 'Electric meter', kind: 'box', x: 231, z: -6, width: 9, depth: 6, height: 14, bottom: 12, color: '#9ea3a8', metal: true },
    { id: 'DISCONNECT', type: 'Electrical box (outside)', kind: 'box', x: 152, z: -4, width: 12, depth: 4, height: 18, bottom: 34, color: '#a7abaf', metal: true },
    { id: 'CONDENSER', type: 'Mini-split condenser (outside)', code: 'Blueridge', kind: 'box', x: X_BATH + 26 - 34, z: -13, width: 34, depth: 13, height: 28, bottom: 0, color: '#eeeeea', grille: 'north',
      notes: 'On wall brackets below the bathroom window, lined up with its east edge, at about floor level. ⚠ Size is typical for a Blueridge outdoor unit, not measured.' },
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

  // Single sloped ceilings, following the roof: `along` is the vault whose slope it
  // follows; ends close the gap above the walls (z = a wall across x, x = a wall along z).
  slopes: [
    { id: 'Bathroom ceiling', x0: X_BATH, x1: X_EAST, z0: EXT, z1: Z_BATH, along: { x0: X_MAIN, x1: X_EAST, peak: PEAK },
      ends: [{ z: 0, t: EXT }, { x: X_BATH - INT, t: INT }], lights: [[X_BATH + 30, EXT + 48]],
      notes: 'Slopes down to the long outside wall (seen in the bathroom photo), like the kitchen vault. ⚠ Heights follow the kitchen’s 9′ peak; not measured.' },
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

  // Roof and outside trim (see js/roofBuilder.js). plate = roof height at the outside of
  // the walls; overhang = eaves, rake = gable ends, fascia = depth of the white fascia.
  // ⚠ Pitches, overhangs and heights are estimated from the outside photos.
  roof: {
    plate: 101, overhang: 14, rake: 6, fascia: 7,
    // kitchen/bathroom roof: gable at the bathroom end and a small gable end over the
    // living room beam (BEAM-2), where the vault ends
    main: { x0: X_MAIN - OLD, x1: WIDTH, z0: 0, z1: Z_BEAM, pitch: 4.5 / 12 },
    // living room roof: lower and shallower, hipped at the far end; the kitchen roof's
    // slopes come down onto it (the flashed joint in the roof photo)
    low: { z1: LENGTH, pitch: 2.5 / 12 },
    wing: { x0: 0, z0: 0, z1: WING_LENGTH, pitch: 2 / 12 }, // shed over the bedrooms, running up into the main roof, hipped at the entry end
    // outside corners [x, z, outward x sign, outward z sign] get white corner boards
    corners: [[0, 0, -1, -1], [0, WING_LENGTH, -1, 1], [X_MAIN - OLD, LENGTH, -1, 1], [WIDTH, LENGTH, 1, 1], [WIDTH, 0, 1, -1]],
    // recessed lights in the soffits (plan x, z) ⚠ from the photos
    lights: [[120, LENGTH + 7], [265, LENGTH + 7], [WIDTH + 7, LENGTH - 16], [WIDTH + 7, 215], [X_MAIN - OLD - 7, LENGTH - 16]],
    // small gable roof over the entry door; the porch floor is one board below the door sill
    porch: {
      wall: X_MAIN - OLD, z0: WING_LENGTH - 30, z1: WING_LENGTH + 72, depth: 40, overhang: 6, eave: 100, pitch: 6 / 12, back: 90,
      notes: 'Open gable with no tie beam across the front; its side over the bedroom wing comes down onto the wing roof. The porch floor and steps are in `decks` and `stoneSteps`.',
    },
    notes: 'Kitchen/bathroom roof with gables at both ends; a lower, shallower hipped roof over the living room that the kitchen gable end sits above; a shed roof over the bedroom wing; a gable over the entry. ⚠ Pitches and overhangs estimated from the photos.',
  },

  // Dimension lines on the ground outside the walls, as written on the plan.
  dimensions: [
    { from: [-30, 0], to: [-30, WING_LENGTH], text: '24′-3″', notes: 'Bedroom wing, outside faces.' },
    { from: [-60, 0], to: [-60, LENGTH], text: '34′-3″', notes: 'Overall length, outside faces.' },
    { from: [X_MAIN, LENGTH + 30], to: [X_EAST, LENGTH + 30], text: '15′-5″ R.O.', notes: 'Main room width. R.O. = rough opening (framing to framing).' },
    { from: [X_BATH, -30], to: [X_EAST, -30], text: '7′-0″', notes: 'Bathroom width. ⚠ The drawing itself scales closer to 8′-5″.' },
    { from: [WIDTH + 30, EXT], to: [WIDTH + 30, Z_BATH], text: '6′-0″', notes: 'Bathroom depth.' },
    { from: [0, -60], to: [WIDTH, -60], text: `≈ ${fmtFt(WIDTH)} (est.)`, estimate: true, notes: '⚠ Not on the plan: adds the measured 15′-5″ to the bedroom wing width estimated from a photo and assumed wall thicknesses.' },
  ],

  // Decks. outline = outside faces of the framing in plan [x, z]; edges on the house wall
  // (x = wallX) are the ledger. top = deck surface relative to the floor inside.
  // beams / blocking = lines parallel to the house, inches out from the wall.
  // posts = [out, z] of 4×4 posts on concrete deck blocks (only the ones seen so far).
  decks: [
    {
      id: 'Upper deck', wallX: DECK_X, top: -1.5, skirt: 5.25,
      outline: [[DECK_X, UPPER.z0], [DECK_X + UPPER.out, UPPER.z0], [DECK_X + UPPER.out, UPPER.z1], [DECK_X, UPPER.z1]],
      blocking: [UPPER.out / 2],
      materials: ['timbertechSeaSalt', 'deckFraming'], skirtMaterials: ['deckSkirt'],
      posts: [[UPPER.out - 4, UPPER.z1 - 4]],
      notes: '12′ along the house × 10′ out from the wall. Runs from about 26″ north of the sliding door to 46″ south of it. ⚠ That position and the height are estimated from the framing photos.',
    },
    {
      id: 'Lower deck', wallX: DECK_X, top: -1.5 - 7.25, skirt: 5.25,
      outline: [
        [DECK_X, LOWER.z0], [DECK_X + LOWER.out - LOWER.clip, LOWER.z0], [DECK_X + LOWER.out, LOWER.z0 + LOWER.clip],
        [DECK_X + LOWER.out, LOWER.z1], [DECK_X + UPPER.out, LOWER.z1], [DECK_X + UPPER.out, UPPER.z0], [DECK_X, UPPER.z0],
      ],
      beams: [LOWER.out - LOWER.clip], blocking: [50],
      posts: [[LOWER.out - 4, 250], [LOWER.out - 4, LOWER.z0 + LOWER.clip + 6]],
      materials: ['timbertechSeaSalt', 'deckFraming'], skirtMaterials: ['deckSkirt'],
      notes: 'One step (7¼″) below the landing, along its north and outer sides, with a 45° corner; it stops about 2′ short of the landing’s south end. Overall about 15′ along the house × 12′ out. ⚠ Size estimated from the framing photos.',
    },
    {
      id: 'Entry porch', wallX: X_MAIN - OLD, top: -1.5, skirt: 5.25,
      outline: [[X_MAIN - OLD, WING_LENGTH], [X_MAIN - OLD, WING_LENGTH + PORCH.width], [X_MAIN - OLD - PORCH.out, WING_LENGTH + PORCH.width], [X_MAIN - OLD - PORCH.out, WING_LENGTH]],
      materials: ['timbertechSeaSalt', 'deckFraming'], skirtMaterials: ['deckSkirt'],
      notes: 'Landing at the front door, one board below the sill, in the same TimberTech Sea Salt Gray as the back deck. It reaches out further than the step below it. ⚠ Size estimated from the photos.',
    },
    {
      id: 'Entry step', wallX: X_MAIN - OLD - PORCH.out, top: -1.5 - 7.25, skirt: 5.25,
      outline: [[X_MAIN - OLD - PORCH.out, WING_LENGTH], [X_MAIN - OLD - PORCH.out, WING_LENGTH + PORCH.stepWidth], [X_MAIN - OLD - PORCH.out - PORCH.step, WING_LENGTH + PORCH.stepWidth], [X_MAIN - OLD - PORCH.out - PORCH.step, WING_LENGTH]],
      materials: ['timbertechSeaSalt', 'deckFraming'], skirtMaterials: ['deckSkirt'],
      notes: 'Step in front of the landing, flush with it at the bedroom wing side and stopping short of the far side. ⚠ Size estimated from the photos.',
    },
  ],

  // decorative stone steps on the ground, as the last step down
  stoneSteps: [
    { id: 'Entry stone step', box: [X_MAIN - OLD - PORCH.out - PORCH.step - 15, WING_LENGTH + 8, X_MAIN - OLD - PORCH.out - PORCH.step, WING_LENGTH + 8 + 40], top: -16,
      materials: ['entryStoneStep'], notes: 'Last step down from the entry porch to the ground. ⚠ Size and stone not known; drawn as a 40″ × 15″ natural stone slab.' },
  ],

  views: {
    outside: { pos: [WIDTH + 330, 70, LENGTH + 250], target: [X_MAIN + 70, 45, LENGTH - 140] }, // from the south-west corner
    eye: { pos: [215, 64, 395], target: [195, 42, 120] },
  },
};
