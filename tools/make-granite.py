# Regenerate with: python3 tools/make-granite.py  (needs numpy and Pillow)
# Seamless 144" x 72" Navasca granite slab texture: mottled light gray, flowing dark veins, speckle.
import numpy as np
from PIL import Image
W, H = 2048, 1024
rng = np.random.default_rng(42)

def noise(cells_x, cells_y, seed):
    # smooth, tileable value noise: random grid tiled 3x3, upsampled bicubically, centre crop
    r = np.random.default_rng(seed).random((cells_y, cells_x)).astype(np.float32)
    big = np.tile(r, (3, 3))
    img = Image.fromarray(big).resize((W * 3, H * 3), Image.BICUBIC)
    return np.asarray(img)[H:2 * H, W:2 * W]

def fbm(base, octaves, seed, aspect=2):
    out = np.zeros((H, W), np.float32); amp = 1; tot = 0
    for o in range(octaves):
        c = base * 2 ** o
        out += amp * noise(c * aspect, c, seed + o); tot += amp; amp *= 0.5
    return out / tot

def sample(a, xs, ys):
    # bilinear sample of a with wrap-around
    x0 = np.floor(xs).astype(int); y0 = np.floor(ys).astype(int); fx = xs - x0; fy = ys - y0
    x0 %= W; y0 %= H; x1 = (x0 + 1) % W; y1 = (y0 + 1) % H
    return (a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x1] * fx * (1 - fy) + a[y1, x0] * (1 - fx) * fy + a[y1, x1] * fx * fy)

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
# domain warp, stretched diagonally, so the veins flow in long sweeps
wx = fbm(3, 4, 10) - 0.5; wy = fbm(3, 4, 20) - 0.5
def veinset(base, seed, lo, width, warp):
    n = fbm(base, 5, seed)
    w = sample(n, xx + wx * warp + yy * 0.6, yy + wy * warp * 0.5)
    r = 1 - np.abs(2 * w - 1)
    return np.clip((r - lo) / width, 0, 1)
fine = veinset(5, 30, 0.95, 0.04, 700)        # many thin wisps
fine2 = veinset(8, 35, 0.975, 0.02, 500)
main = veinset(3, 40, 0.955, 0.035, 900)
halo = veinset(3, 40, 0.80, 0.16, 900)        # fewer, stronger sweeps
strength = 0.35 + 0.65 * fbm(2, 3, 50)          # vein contrast drifts across the slab
dark = np.clip(main * 0.85 * strength + fine * 0.6 * strength + fine2 * 0.4 + halo * 0.22 * strength, 0, 0.85)

# mottled feldspar (white) and smoky quartz (grey) at crystal scale, plus broad cloudiness
crystals = noise(W // 2, H // 2, 61)            # ~0.15" grains
cloud = fbm(6, 4, 62)
light = np.array([178, 176, 172], np.float32); grey = np.array([104, 103, 102], np.float32)
cloud2 = fbm(14, 3, 63)
t = np.clip((crystals - 0.5) * 1.1 + (cloud - 0.5) * 2.2 + (cloud2 - 0.5) * 1.2 + 0.5, 0, 1)[..., None]
col = light * (1 - t) + grey * t
g = rng.random((H, W))
col = np.where((g < 0.10)[..., None], col * 0.72, col)
col = np.where((g > 0.94)[..., None], col * 1.18, col)
col = np.where((g > 0.991)[..., None], np.array([34, 34, 36], np.float32), col)
col = np.where(((g > 0.9895) & (g < 0.9905))[..., None], np.array([118, 52, 56], np.float32), col)
col = col + (noise(W // 2, H // 2, 70) - 0.5)[..., None] * 30
char = np.array([42, 42, 46], np.float32)
col = col * (1 - dark[..., None]) + char * dark[..., None]
Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).save('/home/user/TuPeek-/textures/navasca-granite.jpg', quality=82, optimize=True)
print('ok')
