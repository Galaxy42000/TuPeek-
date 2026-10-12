# TuPeek: 3D house viewer

An interactive 3D model of the house that runs in the browser, built with [Three.js](https://threejs.org/). Use the menu at the top left to switch between the **Whole house** (building layout from the hand-drawn plan, with the kitchen in place), the detailed **Kitchen**, and each other room on its own (bedrooms, bathroom, utility room, hall, living area).

**Live site (after GitHub Pages is turned on):** https://galaxy42000.github.io/TuPeek-/

## Using the viewer

| Control | What it does |
| --- | --- |
| Drag | Orbit around the room |
| Right-drag / two-finger drag | Pan |
| Scroll / pinch | Zoom |
| Click an object | Shows its ID, measurements and the materials it's made of |
| **Overview / Eye level / Top down** | Camera presets |
| **Walk** | First-person mode: drag to look, W A S D or arrow keys to move (Shift moves faster), Esc to leave. Touch screens get an on-screen pad. |
| **Measurements** | Shows or hides the ID and width labels |
| **Cut away walls** | Hides the walls between the camera and the room, dollhouse style |
| Compass (bottom left) | Always points to true north and shows which way you're facing, in every view and in walk mode |

## Directions

The plans are drawn with the bathroom at the top, but the top of the plans is actually **true east**: standing at the kitchen sink and looking out the window, you face due south. This is set in [`rooms/site.js`](rooms/site.js).

The config files still use **plan directions** for positions (north = top of the drawing, `x` = left to right, `z` = top to bottom). Everything the viewer shows uses **true directions**: wall names, notes, the info panel and the compass. IDs and notes in the config files are written in true directions too.

## Materials

What things are made of is recorded in [`rooms/materials.js`](rooms/materials.js) and shows up when you click an object. Each material has a `name` plus any attributes you want, for example:

```js
oakFloor: { name: 'Hardwood flooring', Species: 'Brazilian oak', 'Board width': '4″', Finish: 'Clear' },
```

- `surfaces` in `rooms/house.js` or `rooms/kitchen.js` sets the default for a kind of surface: `floor`, `tileFloor`, `walls`, `ceiling`, `windows`, `doors`, `cabinets`, `counter`, `backsplash`.
- Any single element (a wall, a room, a door, a cabinet, a fixture…) can have its own `materials: ['oakFloor', …]` list, which replaces the default.
- The direction the floorboards run is `palette.floorBoards` in `rooms/kitchen.js`.

## Changing the building layout

The walls, doors, windows and room sizes of the whole building live in [`rooms/house.js`](rooms/house.js), also in **inches**. Values marked ⚠ were scaled off the drawing or assumed and still need to be measured. The kitchen is built from `rooms/kitchen.js` and dropped into the house unchanged. Every room listed in `rooms` gets its own entry in the menu automatically. Rooms with no wall between them list each other under `with`, so each one's view shows both. Exposed structural steel goes in `beams`; walls it runs through are cut away around it. Vaulted ceilings go in `vaults` (peak height, plus the end walls that close them off).

## Changing the kitchen

All of the kitchen's measurements live in one file: [`rooms/kitchen.js`](rooms/kitchen.js). Everything in it is in **inches**.

- Walls are named by **plan direction**: `north` is the range wall and `east` is the sink/window wall, matching the top of the plans. In true directions (what the viewer shows), the range wall is east and the sink wall is south.
- `start` is the distance from a wall's **left corner** as you stand in the room facing that wall.
- Cabinet runs list their boxes from left to right. Changing one width shifts everything to its right.
- Every cabinet, appliance, window and door has an ID (B1, U3, SINK, FRIDGE, W1…). Click an object in the viewer to see its ID.

## Project layout

```
index.html          page shell + import map (no build step)
sw.js               service worker that turns off caching (always loads the latest version)
css/style.css       UI styles
js/main.js          renderer, cameras, walk mode, click-to-inspect
js/roomBuilder.js   turns a room config into 3D geometry
js/houseBuilder.js  turns the house config into walls, rooms and dimensions
js/fixtures.js      cabinets, appliances, sink, windows, lights, stools
js/houseFixtures.js toilet, vanity, shower, washer/dryer, mechanical boxes
js/materials.js     materials + procedural textures (wood, tile, quartz)
js/compass.js       plan → true directions
rooms/index.js      list of views in the menu
rooms/house.js      building walls, doors, windows, rooms  ← edit this
rooms/materials.js  materials & finishes shown when you click something  ← edit this
rooms/site.js       which way the plans face (true north)
rooms/kitchen.js    kitchen layout & measurements  ← edit this
vendor/three/       Three.js r169 (MIT), vendored so the site has no CDN dependency
```

## Running locally

ES modules need to be served over HTTP:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Turning on GitHub Pages

1. On GitHub, go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose branch **main**, folder **/ (root)**, then **Save**.
4. After a minute or two the site is live at https://galaxy42000.github.io/TuPeek-/.

On a free GitHub plan, Pages only works for public repositories.
