# Image-to-E-commerce-Listing
> Course Project for the course: Introduction to Machine Learning

An automated pipeline that converts product images into ready-to-publish e-commerce listings by performing segmentation, caption generation, and category classification.

## Table of Contents

- [Introduction](#introduction)  
- [Features](#features)  
- [Technology Stack](#technology-stack)  
- [Installation](#installation)  
- [Usage](#usage)  

## Introduction

This project enables users to upload a product image and automatically receive:
- A segmented image isolating the product.  
- A descriptive caption suitable for e-commerce platforms.  
- Predicted category labels for efficient indexing.  

## Features

- **Product Segmentation** using Meta AI’s Segment Anything Model (SAM).  
- **Automated Description** via a fine-tuned BLIP model.  
- **Category Classification** with transfer learning of Vision Transformer (ViT) on specific dataset.  

## Technology Stack

| Component           | Technology                            |
|---------------------|---------------------------------------|
| Frontend            | Next.js                               |
| Backend             | FastAPI                               |
| Segmentation Model  | SAM (Segment Anything Model)          |
| Captioning Model    | BLIP (Bootstrapped Language–Image Pretraining) |
| Classification Model| Vision Transformer (ViT)              |
| Orchestration       | Custom `run.js` script                |

## Installation

[To be Added]

## Usage

Run both servers with the orchestration script:
```bash
node run.js
```

or start them individually with
```bash
uvicorn backend.api.api:app --reload
cd frontend && npm install && npm run dev
```