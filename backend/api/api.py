from segment_anything import sam_model_registry, SamPredictor
from transformers import BlipProcessor, BlipForConditionalGeneration, ViTForImageClassification, pipeline
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from typing import List
import torch
from torchvision import transforms
import matplotlib.pyplot as plt
import numpy as np
import base64
import cv2
import io
import os 

class SegmentAnythingModel:
    BASE_MODEL = 'backend/api/models/sam_vit_b_01ec64.pth'
    HIGH_MODEL = 'backend/api/models/sam_vit_h_4b8939.pth'
    BASE_MODEL_TYPE = 'vit_b'
    HIGH_MODEL_TYPE = 'vit_h'
    DEVICE = "cpu"

    def __init__(self) -> None:
        if os.path.exists(self.BASE_MODEL):
            self.base_model = sam_model_registry[self.BASE_MODEL_TYPE](checkpoint=self.BASE_MODEL)
            self.base_model.to(device=self.DEVICE)
            self.base_predictor = SamPredictor(self.base_model)

        if os.path.exists(self.HIGH_MODEL):
            self.high_model = sam_model_registry[self.HIGH_MODEL_TYPE](checkpoint=self.HIGH_MODEL)
            self.high_model.to(device=self.DEVICE)
            self.high_predictor = SamPredictor(self.high_model)
        
        self.image: np.array = None
        self.input_point: List[List[int]] = []
        self.input_labels: np.ndarray = None

    def set_current_model(self, model: str) -> None:
        if model == 'vit_h':
            self.predictor = self.high_predictor
        if model == 'vit_b':
            self.predictor = self.base_predictor

    def load_image(self, image: np.ndarray) -> None:
        self.image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        self.predictor.set_image(self.image)
        
    def load_points(self, points: List[List[int]]) -> None:
        self.input_point = np.array(points, dtype=np.float32)
        self.input_label = np.ones(len(points), dtype=int)

    def segment_image(self) -> np.ndarray:
        if self.image is None:
            raise Exception("Input Image to the Model cannot be None!")

        if len(self.input_point) < 1:
            raise Exception("You must select atleast 31 point to segment!")

        masks, _, _ = self.predictor.predict(
            point_coords=self.input_point,
            point_labels=self.input_label,
            multimask_output=True,
        )

        mask = masks[0]
        binary_mask = mask > 0.5
        extracted = np.where(binary_mask[..., None], self.image, 255).astype(np.uint8)
        return extracted
    
class ImageCaptioning:
    LOCAL_DIR = 'backend/api/models/blip_model'
    def __init__(self) -> None:
        self.processor = BlipProcessor.from_pretrained(self.LOCAL_DIR, local_files_only=True)
        self.model = BlipForConditionalGeneration.from_pretrained(self.LOCAL_DIR, local_files_only=True)
        self.image: Image = None

    def load_image(self, image_bytes: str) -> None:
        self.image = Image.open(io.BytesIO(image_bytes))
        self.inputs = self.processor(images=self.image, return_tensors="pt")

    def generate_caption(self) -> str:
        if self.image is None:
            raise Exception("Input image is None!")

        output_ids = self.model.generate(**self.inputs,max_new_tokens=1000)
        caption = self.processor.decode(output_ids[0], text="Please Generate a Caption for this: ", skip_special_tokens=True)
        
        return str(caption)

class ImageClassifier:
    MODEL_PATH = "backend/api/models/product_classifier.pth"  
    IMG_SIZE = 100
    NUM_CLASSES = 21
    DEVICE = "cpu" 

    def __init__(self):
        self.transform = transforms.Compose([
            transforms.Resize((self.IMG_SIZE, self.IMG_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225])
        ])
        self.class_names = [
            'All_Beauty', 'All_Electronics', 'Appliances', 'Arts_Crafts_Sewing', 'Automotive', 
            'Baby', 'Baby_Products', 'Beauty', 'Cell_Phones_Accessories', 'Clothing_Shoes_Jewelry', 
            'Electronics', 'Grocery_Gourmet_Food', 'Health_Personal_Care', 'Industrial_Scientific', 
            'Musical_Instruments', 'Office_Products', 'Patio_Lawn_Garden', 'Pet_Supplies', 'Sports_Outdoors', 
            'Tools_Home Improvement', 'Toys_Games'
        ]

        self.model = ViTForImageClassification.from_pretrained(
            "google/vit-base-patch16-224",
            num_labels=self.NUM_CLASSES,
            ignore_mismatched_sizes=True,
            image_size = 100
        )
        self.model.load_state_dict(torch.load(self.MODEL_PATH, map_location=self.DEVICE))
        self.model.to(self.DEVICE)
        self.model.eval()

    def predict(self, image_bytes: bytes) -> dict:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_tensor = self.transform(image).unsqueeze(0).to(self.DEVICE)

        with torch.no_grad():
            outputs = self.model(image_tensor)
            probs = torch.nn.functional.softmax(outputs.logits, dim=1)
            conf, pred = torch.max(probs, 1)

        class_index = pred.item()
        class_name = self.class_names[class_index]
        confidence = conf.item()

        return {
            "class": class_name,
            "confidence": f"{confidence:.2%}"
        }


SAM_Model = SegmentAnythingModel()
ImageCaptionModel = ImageCaptioning()
ImageClassifierModel = ImageClassifier()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "Server is active!"
    }, 200

@app.post("/segment-image")
async def segment_image(
    image: str = Body(..., embed=True, example="base64 encoded image.png in strings"),
    points: List[List[int]] = Body(..., example=[[1, 2], [100, 200]]),
    model: str = Body(..., example="vit_b")
):
    try:
        img_bytes = base64.b64decode(image)
        img_pillow = Image.open(io.BytesIO(img_bytes))
        img_array = np.array(img_pillow)

        if not all(len(p) == 2 for p in points):
            raise ValueError("Points must be of the format [[x1, y1], [x2, y2], ...]")

        SAM_Model.set_current_model(model)
        SAM_Model.load_image(img_array)
        SAM_Model.load_points(points)
        extracted_image = SAM_Model.segment_image()

        _, buffer = cv2.imencode(".png", extracted_image)
        extracted_base64 = base64.b64encode(buffer).decode()

        return {
            "image": extracted_base64
        }, 200

    except Exception as error:
        return {
            "error": f"{str(error)}"
        }, 400
    
@app.post("/image-captioning")
async def image_captioning(
    image: str = Body(..., embed=True, example="base64 encoded image.png in strings")
):
    try:
        image_bytes = base64.b64decode(image)
        ImageCaptionModel.load_image(image_bytes)
        caption = ImageCaptionModel.generate_caption()

        return {
            "caption": caption
        }, 200

    except Exception as error:
        return {
            "error": f"{str(error)}"
        }, 400

@app.post("/image-classify")
async def classify_image(
    image: str = Body(..., embed=True, example="base64 encoded image")
):
    try:
        image_bytes = base64.b64decode(image)
        result = ImageClassifierModel.predict(image_bytes)

        return {
            "class": result["class"],
            "confidence": result["confidence"]
        }, 200

    except Exception as error:
        return {
            "error": f"{str(error)}"
        }, 400