// Materials and finishes. Clicking something in the viewer lists the materials it is
// made of, with these attributes. `name` is the heading; every other entry is shown
// as "label: value", in the order written here, so add whatever attributes you like.
//
// How things get their materials (rooms/house.js and rooms/kitchen.js):
//  • `surfaces` in a config sets defaults by kind of surface: floor, tileFloor,
//    walls, ceiling, windows, doors, cabinets, counter, backsplash.
//  • Any single element (a wall, room, door, cabinet, fixture…) can list its own
//    `materials: ['key', …]`, which replaces the default. An entry can also be an
//    object written out in place, in the same format as below.
export default {
  oakFloor: {
    name: 'Hardwood flooring',
    Species: 'Brazilian oak',
    'Board width': '4″',
    Finish: 'Clear',
    'Boards run': 'East–west', // keep in step with palette.floorBoards in rooms/kitchen.js
  },
  kolbeWindow: {
    name: 'Window',
    Maker: 'Kolbe Windows & Doors',
    Outside: 'Black frames, white trim',
  },
  reebEntryDoor: {
    name: 'Entry door',
    Brand: 'Reeb',
    Material: 'Fiberglass',
    Style: '5-lite (five stacked glass panes)',
    Size: '36″ × 80″',
    Color: 'Red',
  },
  vinylSiding: {
    name: 'Siding',
    Material: 'Vinyl',
    Style: 'Vertical (board and batten)',
    Color: 'Gray',
    Trim: 'White corner boards, window trim, fascia and soffits',
  },
  clipstone: {
    name: 'Stone skirt',
    Brand: 'Clipstone (Canada)',
    Look: 'Gray stacked ledgestone with a stone cap',
  },
  roofShingles: {
    name: 'Roof',
    Material: 'Asphalt shingles, dark gray',
  },
  kolbeSlider: {
    name: 'Sliding glass patio door',
    Maker: 'Kolbe Windows & Doors (label on the glass in the photo)',
    Width: '6′',
  },
  cherrySill: {
    name: 'Window sill',
    Wood: 'Cherry',
    Finish: 'Varnished',
  },
  graniteSill: {
    name: 'Window sill',
    Material: 'Granite',
    Stone: 'Navasca (Antonio Grey), to match the countertops ⚠ assumed',
  },
  navascaGranite: {
    name: 'Granite',
    Stone: 'Navasca granite (also sold as Antonio Grey)',
    Look: 'White and cream, with smoky grey quartz, brown mica, black tourmaline and small red garnets',
  },
  drywallReturns: {
    name: 'Window returns (top and sides)',
    Material: 'Sheetrock, painted',
    Casing: 'None',
  },
  timbertechSeaSalt: {
    name: 'Composite decking',
    Brand: 'TimberTech',
    Color: 'Sea Salt Gray',
    Layout: 'Picture-frame border board around the field; field boards run parallel to the house',
  },
  deckSkirt: {
    name: 'Deck skirt',
    Material: 'TimberTech composite, Sea Salt Gray (same as the decking)',
    Height: '5¼″',
  },
  deckFraming: {
    name: 'Deck framing',
    Material: 'Pressure-treated lumber, joist hangers',
    Joists: '2× at 16″ on center ⚠ sizes estimated from the photo',
  },
  craftmaidMaple: {
    name: 'Cabinets',
    Brand: 'CraftMaid',
    Wood: 'Maple, natural',
    'Door style': 'Shaker',
    Finish: 'Clear',
  },
  electroluxRange: {
    name: 'Range',
    Brand: 'Electrolux',
    Cooktop: 'Induction',
    Width: '30″',
  },
  dreamlineShower: {
    name: 'Shower enclosure',
    Brand: 'DreamLine',
    Type: 'Frameless neo-angle, hinged door, chrome hardware',
    Base: 'White neo-angle base',
  },
  showerTile: {
    name: 'Shower wall tile',
    Look: 'White, 12″ × 24″, laid horizontally in a running bond, with two recessed niches',
  },
  porcelainFloorTile: {
    name: 'Floor tile',
    Material: 'Porcelain',
    Look: 'Gray marble look, 12″ × 24″, staggered',
  },
  ditraHeat: {
    name: 'Heated floor',
    Brand: 'Schluter',
    System: 'DITRA-HEAT electric floor warming, under the tile',
  },
  ledMirror: {
    name: 'Mirror',
    Type: 'LED-backlit, with touch controls',
  },
  steelW8: {
    name: 'Structural steel',
    Shape: 'W-flange (wide-flange I-beam)',
    'Flange width': '4″',
    Depth: '8″',
    'Likely size': 'W8×10, W8×13 or W8×15 (all have a 4″ flange); weight per foot not confirmed',
  },
};
