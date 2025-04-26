"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Upload, Home, User } from "lucide-react"
import { ImageSegmentationModal } from "@/components/image-segmentation-modal"

export default function ImageUploadPage() {
  const [image, setImage] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isSegmentationModalOpen, setIsSegmentationModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lastFileName, setLastFileName] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0])
    }
  }

  const handleImageUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        const imageData = e.target.result as string
        setImage(imageData)
        setIsSegmentationModalOpen(true)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        handleImageUpload(e.target.files[0]);
        setLastFileName(e.target.files[0].name);
    }
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; 
    }
  };

  const handleSegmentationComplete = (segmentedImage: string) => {
    setImage(segmentedImage)
  }

  const handleGenerateDescription = async () => {
    if (!image) return;
  
    const [, base64Data] = image.split(/data:.*;base64,/, 2);
    console.log("payload length mod 4:", base64Data.length % 4);
  
    const response = await fetch("http://localhost:8000/image-captioning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Data })
    });
  
    if (!response.ok) {
      const err = await response.json();
      console.error("Server error:", err);
      return;
    }
    
    const data = await response.json();
    console.log(data);
    const caption = data.caption ?? data[0]?.caption;
    setDescription(caption);
  }

  const handleGenerateTags = async () => {
    if (!image) return;
    const [, base64Data] = image.split(/data:.*;base64,/, 2);
    console.log("payload length mod 4:", base64Data.length % 4);
  
    const response = await fetch("http://localhost:8000/image-classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Data })
    });

    if(!response.ok){
      const err = await response.json();
      console.error("Server Error: ", err);
      return;
    }
    const data = await response.json();
    console.log(data);
    const tag = data.class ?? data[0]?.class;
    setTags([tag]);
  }

  const handleUpload = () => {
    alert("Image uploaded successfully with description and tags!")
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <header className="bg-black text-white p-4 flex justify-between items-center">
        <div className="text-xl font-bold">E-commerce</div>
        <div className="space-x-2">
          <Button variant="ghost" className="text-white hover:text-white hover:bg-gray-800">
            <Home className="mr-2 h-4 w-4" /> Home Page
          </Button>
          <Button variant="ghost" className="text-white hover:text-white hover:bg-gray-800">
            <User className="mr-2 h-4 w-4" /> Profile
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-6 max-w-3xl">
        <Card className="p-6">
          {/* Image Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer mb-6 transition-colors ${
              isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              className="hidden"
              accept="image/*"
            />
            {image ? (
              <div className="flex justify-center">
                <img src={image || "/placeholder.svg"} alt="Uploaded" className="max-h-64 max-w-full" />
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-lg font-medium">Drag and drop an image here, or click to select</p>
                <p className="text-sm text-gray-500 mt-1">Supports JPG, PNG, GIF</p>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Image Description
            </label>
            <Textarea
              id="description"
              placeholder="Description will appear here..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Image Tags/Labels</label>
            <div className="min-h-[50px] p-3 border rounded-md">
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Tags will appear here...</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={handleGenerateDescription} variant="outline">
              Generate Description
            </Button>
            <Button onClick={handleGenerateTags} variant="outline">
              Generate Labels/Tags
            </Button>
            <Button onClick={handleUpload} disabled={!image} className="bg-yellow-400 hover:bg-yellow-500 text-black">
              Upload
            </Button>
          </div>
        </Card>
      </main>

      {isSegmentationModalOpen && image && (
        <ImageSegmentationModal
          isOpen={isSegmentationModalOpen}
          onOpenChange={(isOpen) => {
            setIsSegmentationModalOpen(isOpen);
            if (!isOpen) {
              resetFileInput();
            }
          }}
          imageData={image}
          onSegmentationComplete={handleSegmentationComplete}
        />
      )}
    </div>
  )
}
