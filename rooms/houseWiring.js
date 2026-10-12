// ============================================================================
//  WIRING LAYOUT for rooms/house.js — inches, plan coordinates (x east, z south, y up
//  from the floor), like the rest of the house. Notes are in true directions.
//
//  Pieced together from the framing photos: yellow 12/2 and orange 10/x NM cable and
//  bundles of blue Cat6 laid over the scissor trusses, new-construction cans on the
//  kitchen trusses, the round box on blocking in the living room, the four-gang box
//  beside the entry door, and the 200 A Square D QO panel in the utility room with
//  the tankless heater beside it. Everything else (which breaker feeds what, where the
//  receptacles and switches go, how the cables are routed) is a proposed layout to
//  code-typical spacing — every run is ⚠ until checked against the house.
//
//  Cables leave the top of the panel and run over the ceiling (on the truss bottom chords
//  or ceiling joists); the heavy 240 V circuits and the island run under the floor.
// ============================================================================

export function houseWiring(c) {
  const { X_MAIN, X_EAST, X_BATH, INT, EXT, KX, KZ, Z_BATH, Z_CLOSET, Z_BEAM, Z_SOUTH, LENGTH, WIDTH, WING_LENGTH, OLD, D_BR1, DIVIDER, X_PANEL, kitchen } = c;
  const ml = c.roof.low.pitch, P = c.roof.plate, xa = c.roof.main.x0, xb = c.roof.main.x1;
  const vx0 = X_MAIN, vx1 = X_EAST, xv = (vx0 + vx1) / 2;
  const vault = (x) => c.HEIGHT + (c.PEAK - c.HEIGHT) * Math.max(0, 1 - Math.abs(x - xv) / (xv - vx0));
  // ceiling height over a plan point (the cables lie just above it)
  const ceilY = (x, z) => {
    if (x < X_MAIN - OLD) return c.HEIGHT; // bedroom wing: flat
    if (z > Z_BEAM + 2) { // living room: follows the hip roof, 6¼″ below it
      const at = (x, z) => Math.min(P + ml * (xb - x), P + ml * (x - xa), P + ml * (LENGTH - z));
      return Math.max(c.HEIGHT, at(x, z) - (at(X_MAIN, (Z_BEAM + Z_SOUTH) / 2) - c.HEIGHT));
    }
    if (z >= Z_BATH || x >= X_BATH) return vault(x); // kitchen vault, bathroom slope
    return c.HEIGHT; // hall and utility room: flat
  };
  const over = (x, z) => ceilY(x, z) + 2.5;
  const CRAWL = -8; // under the floor joists
  const cav = { east: EXT / 2, south: X_EAST + EXT / 2, west: Z_SOUTH + EXT / 2, entry: X_MAIN - OLD / 2, wingN: EXT / 2, old: X_MAIN - OLD / 2, range: Z_BATH + INT / 2, bathN: X_BATH - INT / 2, wingW: WING_LENGTH - EXT / 2 };

  // ---- path building ----
  // a stop is [x, y, z] plus how the cable gets there from the stop before: over the
  // ceiling (default; turning x first, or z first with turn: 'zx'), along inside the wall
  // at `wall` inches up, or under the floor
  const sample = (a, b, y) => {
    const out = [], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 12));
    for (let i = 1; i <= n; i++) {
      const x = a[0] + ((b[0] - a[0]) * i) / n, z = a[1] + ((b[1] - a[1]) * i) / n;
      out.push([x, y ? y(x, z) : over(x, z), z]);
    }
    return out;
  };
  const hop = (a, b) => {
    const [ax, ay, az] = a.at, [bx, by, bz] = b.at;
    if (b.wall !== undefined) return [[ax, b.wall, az], [bx, b.wall, bz], b.at];
    if (b.floor) {
      const corner = b.turn === 'zx' ? [ax, bz] : [bx, az];
      return [[ax, CRAWL, az], ...sample([ax, az], corner, () => CRAWL), ...sample(corner, [bx, bz], () => CRAWL), b.at];
    }
    const corner = b.turn === 'zx' ? [ax, bz] : [bx, az];
    return [[ax, over(ax, az), az], ...sample([ax, az], corner), ...sample(corner, [bx, bz]), b.at];
  };
  const runs = [], devices = [];
  let slot = 0;
  // a circuit: a home run from the panel, then on from stop to stop
  const circuit = (id, cable, notes, stops, { from = 'top' } = {}) => {
    const px = X_PANEL + 1.5 + ((slot++ * 1.1) % 11.5);
    const start = { at: from === 'top' ? [px, 65, cav.east] : [px, 29, cav.east] };
    const path = [start.at];
    let prev = start;
    for (const s of stops) {
      const st = Array.isArray(s) ? { at: s } : s;
      if (prev === start && from === 'bottom' && !st.floor && st.wall === undefined) st.floor = true;
      path.push(...hop(prev, st));
      prev = st;
    }
    runs.push({ id, cable, notes, path });
  };
  // devices: on a wall (face 'x' or 'z'), or in the ceiling
  const dev = (id, kind, x, y, z, face, notes, more = {}) => {
    devices.push({ id, kind, at: [x, y, z], face, notes, ...more });
    return { at: [x, y, z], ...more.via };
  };
  const ceil = (x, z) => ({ at: [x, ceilY(x, z), z] });
  const smoke = (id, x, z) => { devices.push({ id, kind: 'smoke', at: [x, ceilY(x, z) - 0.75, z], face: 'y', notes: 'Hard-wired smoke / CO alarm, interconnected with the others (14/3). ⚠ Proposed position.' }); return ceil(x, z); };

  // kitchen positions in house coordinates
  const K = (x, z) => [KX + x, KZ + z];
  const RANGE_C = KX + kitchen.baseRuns[0].start + 21 + 15; // centre of the range
  const cans = kitchen.lighting.cans.map(([x, z]) => K(x, z));
  const isl = kitchen.islands[0].counter;
  const pend = [-0.3, 0.3].map((f) => [KX + isl.x + isl.width / 2 + f * isl.width, KZ + isl.z + isl.depth / 2]);
  const SLIDER_END = KZ + kitchen.baseRuns[1].start + 84 + 0.75 + kitchen.baseRuns[1].extendRight + 1.5 + 72;

  // ---------------- switches ----------------
  const swKitchen = dev('SW-KITCHEN', 'switch', cav.old, 48, D_BR1 + 30 + 6, 'x', 'Three-gang switch box on the walkway wall beside the bedroom 1 door: kitchen cans, island pendants, walkway. ⚠ Proposed.', { gang: 3 });
  const swSlider = dev('SW-SLIDER', 'switch', cav.south, 48, SLIDER_END + 5, 'x', 'Two-gang switch box beside the sliding door: deck/soffit lights and kitchen cans (3-way). ⚠ Proposed.', { gang: 2 });
  const swEntry = { at: [cav.entry, 48, WING_LENGTH + 6 + 4.1] }; // the four-gang box drawn as a fixture (SW-ENTRY)
  const swHall = dev('SW-HALL', 'switch', cav.old, 48, Z_CLOSET + 14, 'x', 'Two-gang switch box in the hall: hall and utility room lights. ⚠ Proposed.', { gang: 2 });
  const swBath = dev('SW-BATH', 'switch', cav.bathN, 48, EXT + 34, 'x', 'Three-gang box inside the bathroom door: light, fan, and the Ditra-Heat floor thermostat. ⚠ Proposed.', { gang: 3 });
  const swBr1 = dev('SW-BR1', 'switch', cav.old, 48, D_BR1 - 4, 'x', 'Bedroom 1 light switch, inside the door. ⚠ Proposed.');
  const swBr2 = dev('SW-BR2', 'switch', cav.old, 48, 245 - 4, 'x', 'Bedroom 2 light switch, inside the door. ⚠ Proposed.');

  // ---------------- kitchen ----------------
  circuit('K-LIGHTS · 15 A', '14/2', 'Kitchen recessed cans (the new-construction cans hung on the scissor trusses in the photo, wired with NM along the bottom chords), the island pendants and the walkway; switched at SW-KITCHEN and 3-way at SW-SLIDER. ⚠ Breaker size and switching proposed.', [
    swKitchen,
    // up and down the four rows of cans
    ...[0, 1, 2, 3].flatMap((row) => (row % 2 ? [2, 1, 0] : [0, 1, 2]).map((i) => ceil(...cans[row * 3 + i]))),
    { ...ceil(...pend[1]), turn: 'zx' }, ceil(...pend[0]),
    { ...swSlider, turn: 'zx' },
  ]);
  const ctr = 44; // countertop receptacles, 8″ over the counter
  circuit('K-SA1 · 20 A GFCI', '12/2', 'Small-appliance circuit 1: countertop receptacles on the range wall and the corner. GFCI protected. ⚠ Proposed.', [
    { at: dev('K1', 'gfci', RANGE_C - 26, ctr, cav.range, 'z', 'Countertop GFCI left of the range.').at, turn: 'zx' },
    dev('K2', 'outlet', RANGE_C + 32, ctr, cav.range, 'z', 'Countertop receptacle right of the range.', { via: { wall: ctr } }),
    dev('K3', 'outlet', cav.south, ctr, KZ + 20, 'x', 'Countertop receptacle in the corner, sink wall.'),
  ]);
  circuit('K-SA2 · 20 A GFCI', '12/2', 'Small-appliance circuit 2: the sink-wall counter past the window and the island (fed under the floor). ⚠ Proposed.', [
    { at: dev('K4', 'gfci', cav.south, ctr, KZ + 92, 'x', 'Countertop GFCI past the window, over the dishwasher.').at, turn: 'zx' },
    dev('K5', 'outlet', cav.south, ctr, KZ + 112, 'x', 'Countertop receptacle at the end of the sink run.', { via: { wall: ctr } }),
    dev('K6', 'outlet', KX + isl.x + 1.5, 30, KZ + isl.z + isl.depth / 2, 'x', 'Island receptacle on its west end panel, fed up through the floor.', { via: { floor: true, turn: 'zx' } }),
  ]);
  circuit('DW / DISPOSAL · 20 A', '12/2', 'Dishwasher (hard-wired at its junction box) and the disposal receptacle under the sink. ⚠ Proposed.', [
    { at: dev('DISP', 'outlet', cav.south, 14, KZ + 64, 'x', 'Switched receptacle for the disposal, in the sink base.').at, turn: 'zx' },
    dev('DW-J', 'junction', cav.south - 2, 4, KZ + 92, 'x', 'Dishwasher junction box (hard-wired).', { via: { wall: 10 } }),
  ]);
  circuit('FRIDGE · 20 A', '12/2', 'Dedicated refrigerator receptacle behind the fridge. ⚠ Proposed.', [
    { at: dev('FRIDGE-R', 'outlet', K(kitchen.tall[1].start + 18, 0)[0], 48, cav.range, 'z', 'Refrigerator receptacle.').at, turn: 'zx' },
  ]);
  circuit('MICROWAVE · 20 A', '12/2', 'Dedicated receptacle for the over-the-range microwave, inside the cabinet above it. ⚠ Proposed.', [
    { at: dev('MW-R', 'outlet', RANGE_C, 74, cav.range, 'z', 'Microwave receptacle in the cabinet over it.').at, turn: 'zx' },
  ]);
  circuit('RANGE · 50 A 240 V', '6/3', 'Induction range: 50 A 240 V, 6/3 run under the floor to a 14-50 receptacle behind the range. ⚠ Size per the range’s nameplate.', [
    { at: dev('RANGE-R', 'r240', RANGE_C, 5, cav.range, 'z', 'NEMA 14-50 range receptacle.').at, floor: true, turn: 'zx' },
  ], { from: 'bottom' });

  // ---------------- utility room ----------------
  circuit('WATER HEATER · 2 × 40 A 240 V', '8/2', 'EcoSmart electric tankless water heater beside the panel: two 40 A double-pole breakers, two 8/2 cables (drawn as one). ⚠ Count and size per the heater’s model (an ECO 18 takes 2 × 40 A).', [
    { at: [c.X_PANEL + 26, 66, cav.east], wall: 66 },
  ]);
  circuit('WASHER/DRYER · 30 A 240 V', '10/3', 'All-in-one washer/dryer: 30 A 240 V, 10/3 along the back wall to a 14-30 receptacle behind it. ⚠ Many all-in-one units are 120 V; check the model.', [
    { at: [X_BATH - INT - 16, 24, cav.east], wall: 24 },
    dev('WD-R', 'r240', X_BATH - INT - 16, 40, cav.east, 'z', 'NEMA 14-30 receptacle behind the washer/dryer.'),
  ], { from: 'bottom' });
  circuit('WELL PUMP · 20 A 240 V', '12/2', 'Well pump through the pressure switch on the tank, then out under the floor toward the well. ⚠ Route to the well unknown.', [
    { at: dev('PS', 'junction', X_BATH - INT - 27.5 - 2 - 8, 30, EXT + 1, 'z', 'Pressure switch on the tank tee (the pump’s control).').at, floor: true },
    { at: [X_BATH - INT - 40, CRAWL, -20], floor: true },
  ], { from: 'bottom' });
  circuit('UTILITY / HALL · 15 A', '14/2', 'Hall and utility room lights and the utility room receptacle; switches at SW-HALL. ⚠ Proposed.', [
    { at: dev('U-R', 'outlet', X_MAIN + 40, 18, cav.east, 'z', 'General receptacle in the utility room.').at, wall: 18 },
    ceil(X_MAIN + 48, (EXT + Z_CLOSET) / 2),
    { ...swHall, turn: 'zx' },
    ceil(X_MAIN + 48, (Z_CLOSET + Z_BATH) / 2 + 2),
  ], { from: 'bottom' });

  // ---------------- bathroom ----------------
  circuit('BATH · 20 A GFCI', '12/2', 'Bathroom receptacle at the vanity (GFCI) and the LED mirror. ⚠ Proposed.', [
    { at: dev('B-R', 'gfci', X_EAST - 38 - 32, 40, cav.east, 'z', 'GFCI receptacle beside the vanity.').at, wall: 24 },
    dev('MIRROR-J', 'junction', X_EAST - 38 - 12, 78, cav.east, 'z', 'Junction box behind the LED mirror.', { via: { wall: 60 } }),
  ], { from: 'bottom' });
  circuit('BATH LIGHTS · 15 A', '14/2', 'Bathroom ceiling light, exhaust fan and the Ditra-Heat floor-warming mat (thermostat in SW-BATH). ⚠ Proposed.', [
    swBath,
    ceil(X_BATH + 30, EXT + 48),
    dev('FAN', 'junction', X_EAST - 24, ceilY(X_EAST - 24, EXT + 24), EXT + 24, 'y', 'Bathroom exhaust fan over the shower area. ⚠ Proposed.'),
    { at: [cav.bathN, 6, EXT + 48], wall: 6 }, // down to the floor-heat mat's cold lead
  ]);

  // ---------------- bedrooms ----------------
  const r = 14; // receptacle height
  circuit('BEDROOM 1 · 15 A AFCI', '14/2', 'Bedroom 1 receptacles and ceiling light. ⚠ Proposed.', [
    swBr1,
    ceil((EXT + X_MAIN - OLD) / 2, (EXT + DIVIDER) / 2),
    { at: dev('BR1-1', 'outlet', cav.old, r, D_BR1 - 30, 'x', 'Receptacle.').at, turn: 'zx' },
    dev('BR1-2', 'outlet', 60, r, cav.east, 'z', 'Receptacle under the high window.'),
    dev('BR1-3', 'outlet', cav.wingN, r, 20, 'x', 'Receptacle.', { via: { wall: r } }),
    dev('BR1-4', 'outlet', cav.wingN, r, 132, 'x', 'Receptacle past the window.', { via: { wall: r } }),
  ]);
  circuit('BEDROOM 2 · 15 A AFCI', '14/2', 'Bedroom 2 receptacles and ceiling light. ⚠ Proposed.', [
    swBr2,
    ceil((EXT + X_MAIN - OLD) / 2, (DIVIDER + WING_LENGTH - EXT) / 2),
    { at: dev('BR2-1', 'outlet', cav.old, r, 200, 'x', 'Receptacle.').at, turn: 'zx' },
    dev('BR2-2', 'outlet', cav.wingN, r, 176, 'x', 'Receptacle.'),
    dev('BR2-3', 'outlet', cav.wingN, r, 275, 'x', 'Receptacle under the window.', { via: { wall: r } }),
    dev('BR2-4', 'outlet', 70, r, cav.wingW, 'z', 'Receptacle on the end wall.', { via: { wall: r } }),
  ]);

  // ---------------- living room ----------------
  const lr = c.livingLights;
  circuit('LIVING LIGHTS · 15 A', '14/2', 'Living room cans and the ceiling-fan box (BOX-LR), from the four-gang box beside the entry door, plus the porch light. ⚠ Which switch runs what is assumed.', [
    swEntry,
    ceil(lr[0][0], lr[0][1]), ceil(lr[2][0], lr[2][1]), ceil(c.lrBox[0], c.lrBox[1]), ceil(lr[3][0], lr[3][1]), ceil(lr[1][0], lr[1][1]),
    { at: dev('PORCH-J', 'junction', X_MAIN - OLD - 1, 84, WING_LENGTH + 22 + 36 + 8, 'x', 'Porch light beside the entry door (outside). ⚠ Proposed.').at, turn: 'zx' },
  ]);
  circuit('LIVING · 20 A AFCI', '12/2', 'Living room receptacles, about every 12′ along the walls, including the TV wall. ⚠ Proposed.', [
    { at: dev('LR-1', 'outlet', cav.entry, r, 368, 'x', 'Receptacle past the entry door.').at, turn: 'zx' },
    dev('LR-2', 'outlet', X_MAIN + 12, r, cav.west, 'z', 'Receptacle.', { via: { wall: r } }),
    dev('LR-3', 'outlet', 228, r, cav.west, 'z', 'TV wall receptacle, between the windows.', { via: { wall: r } }),
    dev('LR-4', 'outlet', cav.south, r, 392, 'x', 'Receptacle.', { via: { wall: r } }),
    dev('LR-5', 'outlet', cav.south, r, 320, 'x', 'Receptacle between the slider and the window.', { via: { wall: r } }),
  ]);
  circuit('MINI-SPLIT · 20 A 240 V', '12/2', 'Mini-split condenser: 240 V through the back wall to the disconnect outside, then a whip to the condenser under the bathroom window. ⚠ Assumes the gray box outside is its disconnect.', [
    { at: [c.disconnect[0], 24, cav.east], wall: 24 },
    { at: [c.disconnect[0], 40, -2], wall: 40 },
    { at: [c.condenser[0], 20, -8], wall: 20 },
  ], { from: 'bottom' });
  runs.push({ id: 'MINI-SPLIT interconnect', cable: '14/4', notes: '14/4 interconnect from the condenser up through the wall and over the vault to the indoor unit above the beam (runs with the refrigerant line set). ⚠ Route assumed.', path: [
    [c.condenser[0], 24, -8], [c.condenser[0], 24, cav.east], [c.condenser[0], over(c.condenser[0], cav.east), cav.east],
    ...sample([c.condenser[0], cav.east], [xv, cav.east]), ...sample([xv, cav.east], [xv, Z_BEAM - 8]), [xv, c.acTop, Z_BEAM - 8],
  ] });
  // service: meter outside to the panel, in the back wall
  runs.push({ id: 'SERVICE', cable: 'service', notes: 'Service entrance cable from the meter on the outside of the bathroom end wall, along inside the wall to the bottom of the panel (200 A). ⚠ Route assumed.', path: [
    [c.meter[0], 18, -3], [c.meter[0], 18, cav.east], [X_PANEL + 7, 18, cav.east], [X_PANEL + 7, 29, cav.east],
  ] });

  // ---------------- outside ----------------
  circuit('OUTSIDE · 20 A GFCI', '12/2', 'Weatherproof GFCI receptacles on the deck beside the slider and at the entry porch. ⚠ Proposed.', [
    { at: dev('EXT-DECK', 'gfci', WIDTH + 0.5, 18, SLIDER_END + 18, 'x', 'Weatherproof GFCI receptacle on the deck.').at, turn: 'zx' },
    { at: dev('EXT-PORCH', 'gfci', X_MAIN - OLD - 0.5, 18, WING_LENGTH + 8, 'x', 'Weatherproof GFCI receptacle at the entry porch.').at, turn: 'zx' },
  ]);
  circuit('SOFFIT LIGHTS · 15 A', '14/2', 'Recessed soffit lights: the two over the deck switched beside the slider, on round the living room end. ⚠ Proposed.', [
    swSlider,
    ...c.soffit.map(([x, z]) => ({ at: [x, P - 4, z], turn: 'zx' })),
  ]);
  circuit('SMOKE ALARMS · 15 A', '14/3', 'Hard-wired, interconnected smoke / CO alarms (14/3): hall, each bedroom, living room. ⚠ Positions proposed.', [
    smoke('SMOKE-HALL', X_MAIN + 60, (Z_CLOSET + Z_BATH) / 2),
    smoke('SMOKE-BR1', (EXT + X_MAIN - OLD) / 2 + 20, 70),
    smoke('SMOKE-BR2', (EXT + X_MAIN - OLD) / 2 + 20, 220),
    { ...smoke('SMOKE-LR', X_MAIN + 40, 330), turn: 'zx' },
  ]);

  // ---------------- data ----------------
  const media = dev('MEDIA', 'data', X_PANEL + 40, 60, cav.east, 'z', 'Low-voltage media box beside the panel, where the Cat6 home runs start (the blue bundles over the trusses in the photos). ⚠ Proposed.', { gang: 2 });
  const data = (id, x, z, face, notes, y = r) => {
    dev(id, 'data', x, y, z, face, notes);
    runs.push({ id: `Cat6 → ${id}`, cable: 'cat6', notes: `Cat6 home run from the media box to ${notes.toLowerCase()} ⚠ Proposed.`, path: [media.at, ...hop(media, { at: [x, y, z], turn: 'zx' })] });
  };
  data('D-TV', 228 + 12, cav.west, 'z', 'The TV wall in the living room.');
  data('D-LR', cav.entry, 390, 'x', 'The living room corner by the entry.');
  data('D-BR1', cav.wingN, 26, 'x', 'Bedroom 1.');
  data('D-BR2', cav.wingN, 182, 'x', 'Bedroom 2.');
  data('D-KITCHEN', cav.south, SLIDER_END + 12, 'x', 'The kitchen end of the living room.');
  data('D-AP', X_MAIN + 70, (Z_BATH + 205) / 2, 'y', 'A ceiling Wi-Fi access point over the walkway.', ceilY(X_MAIN + 70, 140) - 0.75);

  return { runs, devices };
}
