# TuPeek: 3D house viewer

An interactive 3D model of the house that runs in the browser, built with [Three.js](https://threejs.org/). We're starting with the **kitchen**.

**Live site (after GitHub Pages is turned on):** https://galaxy42000.github.io/TuPeek-/

## Using the viewer

| Control | What it does |
| --- | --- |
| Drag | Orbit around the room |
| Right-drag / two-finger drag | Pan |
| Scroll / pinch | Zoom |
| Click an object | Shows its ID and measurements |
| **Overview / Eye level / Top down** | Camera presets |
| **Walk** | First-person mode: drag to look, W A S D or arrow keys to move (Shift moves faster), Esc to leave. Touch screens get an on-screen pad. |
| **Measurements** | Shows or hides the ID and width labels |
| **Cut away walls** | Hides the walls between the camera and the room, dollhouse style |

## Changing the kitchen

All of the kitchen's measurements live in one file: [`rooms/kitchen.js`](rooms/kitchen.js). Everything in it is in **inches**.

- Walls are named **north, east, south, west**. The north wall is the sink/window wall in the viewer.
- `start` is the distance from a wall's **left corner** as you stand in the room facing that wall.
- Cabinet runs list their boxes from left to right. Changing one width shifts everything to its right.
- Every cabinet, appliance, window and door has an ID (B1, U3, SINK, FRIDGE, W1…). Click an object in the viewer to see its ID.

## Project layout

```
index.html          page shell + import map (no build step)
css/style.css       UI styles
js/main.js          renderer, cameras, walk mode, click-to-inspect
js/roomBuilder.js   turns a room config into 3D geometry
js/fixtures.js      cabinets, appliances, sink, windows, lights, stools
js/materials.js     materials + procedural textures (wood, tile, quartz)
rooms/index.js      list of rooms in the house
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
