from requests import post, Response
import base64
import json

segment_image_url = "http://127.0.0.1:8000/segment-image"
image: bytes = open("image.png", "rb").read()
base64_image = base64.b64encode(image).decode()

points = [
    [40, 60],
    [70, 100],
    [150, 125]
]

headers = {
    "Content-Type": "application/json"
}

response: Response = post(segment_image_url, headers=headers, json={
    "image": base64_image,
    "points": points
})

extracted_bytes = json.loads(response.text)[0]["image"]
extracted_image = base64.b64decode(extracted_bytes)
with open("extracted.png", "wb") as f:
    f.write(extracted_image)
    f.close()

image_caption_url = "http://127.0.0.1:8000/image-captioning"
response: Response = post(image_caption_url, headers=headers, json={
    "image": base64_image
})

caption = json.loads(response.text)[0]["caption"]
print(caption)
