from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image

# 1. Load processor & model
processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
model     = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

# 2. Prepare inputs
image = Image.open("image.png")
inputs = processor(images=image, return_tensors="pt")

# 3. Generate caption
output_ids = model.generate(**inputs, max_new_tokens=20)
caption = processor.decode(output_ids[0], skip_special_tokens=True)
print(caption)
