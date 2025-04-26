"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Point {
  x: number
  y: number
}

interface ImageSegmentationModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  imageData: string
  onSegmentationComplete: (segmentedImage: string) => void
}

export function ImageSegmentationModal({
  isOpen,
  onOpenChange,
  imageData,
  onSegmentationComplete,
}: ImageSegmentationModalProps) {
  const [points, setPoints] = useState<Point[]>([])
  const [isSegmenting, setIsSegmenting] = useState(false)
  const [segmentedImage, setSegmentedImage] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>("vit_b")
  const [showModelSelection, setShowModelSelection] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!isOpen || !imageData) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      imageRef.current = img

      const maxWidth = 600
      const maxHeight = 400
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        const ratio = maxWidth / width
        width = maxWidth
        height = height * ratio
      }

      if (height > maxHeight) {
        const ratio = maxHeight / height
        height = height * ratio
        width = width * ratio
      }

      setImageSize({ width, height })

      if (!segmentedImage) {
        setPoints([])
      }

      drawCanvas()
    }
    img.src = imageData
  }, [isOpen, imageData, segmentedImage])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || !imageRef.current) return

    canvas.width = imageSize.width
    canvas.height = imageSize.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = "red"
    ctx.lineWidth = 2

    points.forEach((point) => {

      ctx.beginPath()
      ctx.moveTo(point.x - 5, point.y)
      ctx.lineTo(point.x + 5, point.y)
      ctx.moveTo(point.x, point.y - 5)
      ctx.lineTo(point.x, point.y + 5)
      ctx.stroke()
    })
  }

  useEffect(() => {
    drawCanvas()
  }, [points])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (segmentedImage) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setPoints([...points, { x, y }])
  }

  const handleReset = () => {
    setPoints([])
  }

  const convertToOriginalImageCoordinates = (points: Point[]): number[][] => {
    if (!imageRef.current) return []

    const originalWidth = imageRef.current.naturalWidth
    const originalHeight = imageRef.current.naturalHeight
    const displayWidth = imageSize.width
    const displayHeight = imageSize.height

    return points.map((point) => {
      const originalX = Math.round((point.x / displayWidth) * originalWidth)
      const originalY = Math.round((point.y / displayHeight) * originalHeight)
      return [originalX, originalY]
    })
  }

  const handleSegmentClick = () => {
    if (points.length === 0) {
      alert("Please mark at least one point on the image")
      return
    }

    if (showModelSelection) {
      handleSegment()
    } else {
      setShowModelSelection(true)
    }
  }

  const handleSegment = async () => {
    setIsSegmenting(true)
    setShowModelSelection(false)

    try {
      const canvas = document.createElement("canvas")
      canvas.width = imageRef.current!.naturalWidth
      canvas.height = imageRef.current!.naturalHeight
      const ctx = canvas.getContext("2d")
      ctx!.drawImage(imageRef.current!, 0, 0)

      const base64Image = canvas.toDataURL("image/png").split(",")[1]
      const originalPoints = convertToOriginalImageCoordinates(points)

      const response = await fetch("http://127.0.0.1:8000/segment-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Image,
          points: originalPoints,
          model: selectedModel,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      const data = await response.json()
      const extractedImageBase64 = data[0].image

      setSegmentedImage(`data:image/png;base64,${extractedImageBase64}`)
    } catch (error) {
      console.error("Error during segmentation:", error)
      alert("Segmentation failed. Please try again.")
    } finally {
      setIsSegmenting(false)
    }
  }

  const handleTryAgain = () => {
    setSegmentedImage(null)
  }

  const handleFinish = () => {
    if (segmentedImage) {
      onSegmentationComplete(segmentedImage)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{segmentedImage ? "Segmentation Result" : "Mark the points to segment"}</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center my-4">
          {segmentedImage ? (
            <img
              src={segmentedImage || "/placeholder.svg"}
              alt="Segmented"
              className="max-w-full max-h-[400px] object-contain"
            />
          ) : (
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="border cursor-crosshair"
              width={imageSize.width}
              height={imageSize.height}
            />
          )}
        </div>

        {showModelSelection && (
          <div className="mb-4 p-4 border rounded-md">
            <h3 className="text-sm font-medium mb-2">Select Segmentation Model</h3>
            <div className="flex flex-col space-y-4">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vit_b">sam_vit_b_01ec64 (Balanced speed/quality)</SelectItem>
                  <SelectItem value="vit_h">sam_vit_h_4b8939 (Higher quality)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-center sm:justify-center gap-2">
          {segmentedImage ? (
            <>
              <Button variant="outline" onClick={handleTryAgain}>
                Try Segmenting Again
              </Button>
              <Button onClick={handleFinish}>Finish</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleReset}>
                Reset Markers
              </Button>
              <Button onClick={handleSegmentClick} disabled={isSegmenting || points.length === 0}>
                {isSegmenting ? "Segmenting..." : "Segment"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
