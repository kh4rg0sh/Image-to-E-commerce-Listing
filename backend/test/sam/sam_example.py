import torch
import numpy as np
import cv2
import matplotlib.pyplot as plt
from segment_anything import sam_model_registry, SamPredictor

# ── Setup SAM ──────────────────────────────────────────────────────────────────
sam_checkpoint = "models/sam_vit_b_01ec64.pth"
model_type      = "vit_b"
device          = "cpu"

sam = sam_model_registry[model_type](checkpoint=sam_checkpoint)
sam.to(device=device)

# ── Load image ─────────────────────────────────────────────────────────────────
image = cv2.imread("image.png")
image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

# ── Show image and collect clicks ──────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(8, 8))
ax.imshow(image)
ax.set_title("Click to select points; close window when done")
points = []

def onclick(event):
    # only register clicks inside the axes
    if event.inaxes is ax and event.xdata is not None and event.ydata is not None:
        x, y = int(event.xdata), int(event.ydata)
        points.append((x, y))
        ax.plot(x, y, 'r+', markersize=15)
        fig.canvas.draw()

# connect and show
cid = fig.canvas.mpl_connect('button_press_event', onclick)
plt.show()
fig.canvas.mpl_disconnect(cid)

if len(points) == 0:
    raise RuntimeError("No points selected! Please click at least one point.")

input_point = np.array(points)         # shape (K, 2)
input_label = np.ones(len(points), dtype=int)  # all foreground

# ── Run SAM prediction ────────────────────────────────────────────────────────
predictor = SamPredictor(sam)
predictor.set_image(image)
masks, scores, logits = predictor.predict(
    point_coords=input_point,
    point_labels=input_label,
    multimask_output=True,
)

# ── Extract first mask onto black background ──────────────────────────────────
mask = masks[0]                   # choose the first of the multimasks
binary_mask = mask > 0.5          # binarize
black_bg = np.zeros_like(image)   # pure black canvas
mask_3c = np.stack([binary_mask]*3, axis=-1)
extracted = np.where(mask_3c, image, black_bg).astype(np.uint8)

# ── Display result ────────────────────────────────────────────────────────────
plt.figure(figsize=(6,6))
plt.imshow(extracted)
plt.axis('off')
plt.title("Your Selected Region on Black Background")
plt.show()
