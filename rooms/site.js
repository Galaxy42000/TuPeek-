// Which way the plans face. Both plans (house and kitchen) are drawn with the
// bathroom at the top. Standing at the kitchen sink and looking out the window above
// it, you face due south, which makes the top of the plans true EAST.
//
// The config files keep describing things in plan directions (north = top of the
// drawing). Everything the viewer shows (wall names, notes, the compass) is turned
// into true directions using this.
export default {
  planNorthIs: 'east',
};
