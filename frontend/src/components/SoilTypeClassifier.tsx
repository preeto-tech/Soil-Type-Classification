import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, Image as ImageIcon, Loader2, Check, X } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { useLanguage } from "../context/LanguageContext"
import axios from "axios"

interface PredictionResult {
  predicted_label: string
  confidence: number
  predicted_index: number
}

export function SoilTypeClassifier() {
  const { t } = useLanguage()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const getSoilTypeTranslation = (soilType: string) => {
    const translations: Record<string, string> = {
      "Black Soil": t("blackSoil"),
      "Cinder Soil": t("cinderSoil"),
      "Laterite Soil": t("lateriteSoil"),
      "Peat Soil": t("peatSoil"),
      "Yellow Soil": t("yellowSoil"),
    }
    return translations[soilType] || soilType
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setError(null)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handlePredict = async () => {
    if (!file) return

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await axios.post<PredictionResult>("/predict-type", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      setResult(response.data)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || "Failed to classify soil type")
      } else {
        setError("An unexpected error occurred")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600"
    if (confidence >= 0.6) return "text-yellow-600"
    return "text-orange-600"
  }

  const getSoilTypeColor = (soilType: string) => {
    const colors: Record<string, string> = {
      "Black Soil": "bg-gray-900 text-white",
      "Cinder Soil": "bg-gray-600 text-white",
      "Laterite Soil": "bg-red-700 text-white",
      "Peat Soil": "bg-amber-900 text-white",
      "Yellow Soil": "bg-yellow-600 text-white",
    }
    return colors[soilType] || "bg-gray-500 text-white"
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-6 w-6 text-primary" />
          {t("soilTypeClassification")}
        </CardTitle>
        <CardDescription>
          {t("uploadImage")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {!preview ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={handleUploadClick}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                {t("dragDrop")}
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, JPEG up to 10MB
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <div className="relative rounded-lg overflow-hidden border">
                <img
                  src={preview}
                  alt="Soil preview"
                  className="w-full h-64 object-cover"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handlePredict}
                  disabled={loading}
                  className="flex-1"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("analyzing") || "Analyzing..."}
                    </>
                  ) : (
                    t("classifyButton")
                  )}
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="lg"
                >
                  <X className="h-4 w-4" />
                  {t("clear") || "Clear"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className={`p-6 rounded-lg ${getSoilTypeColor(result.predicted_label)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium opacity-90">{t("predictedLabel")}</span>
                  <Check className="h-5 w-5" />
                </div>
                <h3 className="text-3xl font-bold">{getSoilTypeTranslation(result.predicted_label)}</h3>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("confidence")}</span>
                  <span className={`text-2xl font-bold ${getConfidenceColor(result.confidence)}`}>
                    {(result.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 h-2 bg-background rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.confidence * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full ${result.confidence >= 0.8 ? "bg-green-600" : result.confidence >= 0.6 ? "bg-yellow-600" : "bg-orange-600"}`}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive"
            >
              <div className="flex items-center gap-2">
                <X className="h-4 w-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

