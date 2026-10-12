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
  steelW8: {
    name: 'Structural steel',
    Shape: 'W-flange (wide-flange I-beam)',
    'Flange width': '4″',
    Depth: '8″',
    'Likely size': 'W8×10, W8×13 or W8×15 (all have a 4″ flange); weight per foot not confirmed',
  },
};
