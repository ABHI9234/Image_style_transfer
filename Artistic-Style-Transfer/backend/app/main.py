from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from io import BytesIO
from PIL import Image
import numpy as np
import torch
import torch.optim as optim
import requests
from torchvision import transforms, models
from typing import Optional

app = FastAPI()

# Add CORS middleware to allow frontend requests
origins = [
    "http://localhost:3000",  # frontend dev server
    "http://localhost:8080",  # if another port is used
    "https://arti-style.vercel.app",  # production deployed frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load pretrained VGG19 model for feature extraction
vgg = models.vgg19(weights=models.VGG19_Weights.IMAGENET1K_V1).features

for param in vgg.parameters():
    param.requires_grad_(False)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
vgg.to(device)


def load_image(image_bytes, max_size=128, shape=None):
    image = Image.open(BytesIO(image_bytes)).convert('RGB')
    if max(image.size) > max_size:
        size = max_size
    else:
        size = max(image.size)
    if shape is not None:
        size = shape
    in_transform = transforms.Compose([
        transforms.Resize(size),
        transforms.ToTensor(),
        transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
    ])
    image = in_transform(image)[:3, :, :].unsqueeze(0)
    return image


def im_convert(tensor):
    image = tensor.to("cpu").clone().detach()
    image = image.numpy().squeeze()
    image = image.transpose(1, 2, 0)
    image = image * np.array((0.229, 0.224, 0.225)) + np.array((0.485, 0.456, 0.406))
    image = image.clip(0, 1)
    return Image.fromarray((image * 255).astype('uint8'))


def get_features(image, model, layers=None):
    if layers is None:
        layers = {'0': 'conv1_1',
                  '5': 'conv2_1',
                  '10': 'conv3_1',
                  '19': 'conv4_1',
                  '21': 'conv4_2',
                  '28': 'conv5_1'}
    features = {}
    x = image
    for name, layer in model._modules.items():
        x = layer(x)
        if name in layers:
            features[layers[name]] = x
    return features


def gram_matrix(tensor):
    _, d, h, w = tensor.size()
    tensor = tensor.view(d, h * w)
    gram = torch.mm(tensor, tensor.t())
    return gram


@app.post("/style-transfer/")
async def style_transfer(
    content_file: Optional[UploadFile] = File(None),
    style_file: Optional[UploadFile] = File(None),
    content_url: Optional[str] = Form(None),
    style_url: Optional[str] = Form(None),
):
    if content_file is not None:
        content_bytes = await content_file.read()
        content = load_image(content_bytes).to(device)
    elif content_url is not None:
        response = requests.get(content_url)
        content = load_image(response.content).to(device)
    else:
        return {"error": "No content image provided"}

    if style_file is not None:
        style_bytes = await style_file.read()
        style = load_image(style_bytes, shape=content.shape[-2:]).to(device)
    elif style_url is not None:
        response = requests.get(style_url)
        style = load_image(response.content, shape=content.shape[-2:]).to(device)
    else:
        return {"error": "No style image provided"}

    content_features = get_features(content, vgg)
    style_features = get_features(style, vgg)
    style_grams = {layer: gram_matrix(style_features[layer]) for layer in style_features}
    target = content.clone().requires_grad_(True).to(device)

    style_weights = {'conv1_1': 1,
                     'conv2_1': 0.75,
                     'conv3_1': 0.2,
                     'conv4_1': 0.2,
                     'conv5_1': 0.2}
    content_weight = 1
    style_weight = 1e3
    optimizer = optim.Adam([target], lr=0.003)
    steps = 500

    for ii in range(1, steps + 1):
        target_features = get_features(target, vgg)
        content_loss = torch.mean((target_features['conv4_2'] - content_features['conv4_2']) ** 2)
        style_loss = 0
        for layer in style_weights:
            target_feature = target_features[layer]
            target_gram = gram_matrix(target_feature)
            _, d, h, w = target_feature.shape
            style_gram = style_grams[layer]
            layer_style_loss = style_weights[layer] * torch.mean((target_gram - style_gram) ** 2)
            style_loss += layer_style_loss / (d * h * w)
        total_loss = content_weight * content_loss + style_weight * style_loss

        optimizer.zero_grad()
        total_loss.backward()
        optimizer.step()

    final_img = im_convert(target)
    buf = BytesIO()
    final_img.save(buf, format='JPEG')
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/jpeg")






# Backend:
#
# bash
# cd Artistic-Style-Transfer/backend
# source venv311/bin/activate
# uvicorn app.main:app --reload
# Frontend:
#
# bash
# cd Artistic-Style-Transfer/artistry-essence
# npm install
# npm run dev