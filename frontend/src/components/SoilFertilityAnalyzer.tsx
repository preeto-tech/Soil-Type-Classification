import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Droplets, Loader2, Check, Sparkles, RotateCcw, Upload, Image as ImageIcon, X } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { useLanguage } from "../context/LanguageContext"
import axios from "axios"

interface SoilData {
  N: number
  P: number
  K: number
  ph: number
  ec: number
  oc: number
  S: number
  zn: number
  fe: number
  cu: number
  Mn: number
  B: number
}

interface FertilityResult {
  status: string
  prediction: string
  ml_prediction?: string
  message?: string
  input_data?: SoilData
  ai_verification?: {
    ai_prediction?: string
    confidence?: string
    agreement_with_ml?: string
    key_observations?: string[]
    nutrient_analysis?: {
      strengths?: string[]
      deficiencies?: string[]
      concerns?: string[]
    }
    recommendations?: string[]
    suitable_crops?: string[]
    explanation?: string
    error?: string
    raw_response?: string
  }
}

const getNutrients = (t: (key: string) => string) => [
  { key: "N" as keyof SoilData, label: t("nitrogen"), description: "NH4+ ratio", unit: t("kgHa") },
  { key: "P" as keyof SoilData, label: t("phosphorus"), description: "P content", unit: t("kgHa") },
  { key: "K" as keyof SoilData, label: t("potassium"), description: "K content", unit: t("kgHa") },
  { key: "ph" as keyof SoilData, label: t("ph"), description: "Soil acidity", unit: "" },
  { key: "ec" as keyof SoilData, label: t("ec"), description: "Electrical conductivity", unit: t("dSm") },
  { key: "oc" as keyof SoilData, label: t("oc"), description: "Organic carbon", unit: t("percent") },
  { key: "S" as keyof SoilData, label: t("sulfur"), description: "Sulfur content", unit: t("ppm") },
  { key: "zn" as keyof SoilData, label: t("zinc"), description: "Zinc content", unit: t("ppm") },
  { key: "fe" as keyof SoilData, label: t("iron"), description: "Iron content", unit: t("ppm") },
  { key: "cu" as keyof SoilData, label: t("copper"), description: "Copper content", unit: t("ppm") },
  { key: "Mn" as keyof SoilData, label: t("manganese"), description: "Manganese content", unit: t("ppm") },
  { key: "B" as keyof SoilData, label: t("boron"), description: "Boron content", unit: t("ppm") },
]

const sampleData: SoilData = {
  N: 245,
  P: 8.1,
  K: 560,
  ph: 7.31,
  ec: 0.63,
  oc: 0.78,
  S: 11.6,
  zn: 0.29,
  fe: 0.43,
  cu: 0.57,
  Mn: 7.73,
  B: 0.74,
}

export function SoilFertilityAnalyzer() {
  const { t, language } = useLanguage()
  const [formData, setFormData] = useState<SoilData>({
    N: 0,
    P: 0,
    K: 0,
    ph: 0,
    ec: 0,
    oc: 0,
    S: 0,
    zn: 0,
    fe: 0,
    cu: 0,
    Mn: 0,
    B: 0,
  })
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [result, setResult] = useState<FertilityResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (key: keyof SoilData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: parseFloat(value) || 0,
    }))
  }

  const handleSampleData = () => {
    setFormData(sampleData)
    setResult(null)
    setError(null)
  }

  const handleReset = () => {
    setFormData({
      N: 0,
      P: 0,
      K: 0,
      ph: 0,
      ec: 0,
      oc: 0,
      S: 0,
      zn: 0,
      fe: 0,
      cu: 0,
      Mn: 0,
      B: 0,
    })
    setResult(null)
    setError(null)
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setError(null)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleExtractFromImage = async () => {
    if (!selectedImage) return

    setExtracting(true)
    setError(null)

    try {
      // Method 1: Try FormData approach first
      console.log("Attempting to extract nutrients from image...")
      
      const formData = new FormData()
      formData.append("file", selectedImage)
      formData.append("language", language)

      const response = await axios.post<{
        status: string
        nutrients: SoilData
        message: string
      }>("/extract-nutrients", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000, // 30 second timeout
      })

      console.log("API Response:", response.data)

      if (response.data.status === "Success") {
        // Auto-fill form with extracted nutrients
        setFormData(response.data.nutrients)
        setResult(null)
        setError(null)
        console.log("Successfully extracted nutrients:", response.data.nutrients)
      } else {
        setError(response.data.message || "Failed to extract nutrients")
      }
    } catch (err: unknown) {
      console.error("Error extracting nutrients:", err)
      
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          setError("Request timed out. The image might be too large or the server is busy.")
        } else if (err.response?.status === 404) {
          setError("API endpoint not found. Please check if the backend server is running on port 5000.")
        } else if (err.response?.status === 503) {
          setError("Gemini AI service not available. Please check if GEMINI_API_KEY is set.")
        } else {
          setError(err.response?.data?.message || `Network error: ${err.message}`)
        }
      } else {
        setError("An unexpected error occurred")
      }
    } finally {
      setExtracting(false)
    }
  }

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await axios.post<FertilityResult>("/predict-fertility", formData, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      setResult(response.data)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to analyze soil fertility")
      } else {
        setError("An unexpected error occurred")
      }
    } finally {
      setLoading(false)
    }
  }

  const getFertilityTranslation = (prediction: string) => {
    const translations: Record<string, string> = {
      "Highly Fertile": t("highlyFertile"),
      "Fertile": t("fertile"),
      "Less Fertile": t("lessFertile"),
    }
    return translations[prediction] || prediction
  }

  const getFertilityColor = (prediction: string) => {
    if (prediction === "Highly Fertile") return "from-green-600 to-emerald-700"
    if (prediction === "Fertile") return "from-green-500 to-teal-600"
    return "from-yellow-500 to-orange-600"
  }

  const getFertilityIcon = (prediction: string) => {
    if (prediction === "Highly Fertile") return <Sparkles className="h-6 w-6" />
    if (prediction === "Fertile") return <Check className="h-6 w-6" />
    return <Droplets className="h-6 w-6" />
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-6 w-6 text-primary" />
          {t("fertilityAnalysis")}
        </CardTitle>
        <CardDescription>
          {t("fertilityAnalysis")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Image Upload Section */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">{t("uploadLabReport") || "Upload Lab Report"}</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {t("uploadLabReportDesc") || "Upload an image of your soil test lab report and we'll automatically extract all nutrient values"}
          </p>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />

          <AnimatePresence mode="wait">
            {!imagePreview ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                  type="button"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t("selectLabReport") || "Select Lab Report Image"}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-3"
              >
                <div className="relative rounded-lg overflow-hidden border">
                  <img
                    src={imagePreview}
                    alt="Lab report preview"
                    className="w-full h-48 object-contain bg-gray-50"
                  />
                  <Button
                    onClick={handleRemoveImage}
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  onClick={handleExtractFromImage}
                  disabled={extracting}
                  className="w-full"
                  type="button"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("extracting") || "Extracting Nutrients..."}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t("extractNutrients") || "Extract Nutrients from Image"}
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border"></div>
          <span className="text-xs text-muted-foreground px-2">{t("or") || "OR"}</span>
          <div className="flex-1 h-px bg-border"></div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSampleData}
            variant="outline"
            size="sm"
            type="button"
          >
            <Sparkles className="h-4 w-4" />
            {t("fillSampleData")}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            type="button"
          >
            <RotateCcw className="h-4 w-4" />
            {t("reset") || "Reset"}
          </Button>
        </div>

        <form onSubmit={handlePredict} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getNutrients(t).map((nutrient) => (
              <div key={nutrient.key} className="space-y-2">
                <Label htmlFor={nutrient.key} className="text-sm font-medium">
                  {nutrient.label}
                  {nutrient.unit && <span className="text-muted-foreground ml-1">({nutrient.unit})</span>}
                </Label>
                <p className="text-xs text-muted-foreground -mt-1 mb-1">
                  {nutrient.description}
                </p>
                <Input
                  id={nutrient.key}
                  type="number"
                  step="any"
                  value={formData[nutrient.key] || ""}
                  onChange={(e) => handleChange(nutrient.key, e.target.value)}
                  required
                  className="w-full"
                />
              </div>
            ))}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("analyzing") || "Analyzing..."}
              </>
            ) : (
              t("analyzeButton")
            )}
          </Button>
        </form>

        <AnimatePresence>
          {result && result.status === "Success" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Main Prediction Result */}
              <div className={`p-6 rounded-lg bg-gradient-to-br ${getFertilityColor(result.prediction)} text-white shadow-lg`}>
                <div className="flex items-center gap-3 mb-2">
                  {getFertilityIcon(result.prediction)}
                  <span className="text-sm font-medium opacity-90">{t("fertilityLevel")}</span>
                </div>
                <h3 className="text-3xl font-bold mb-2">{getFertilityTranslation(result.prediction)}</h3>
                <p className="text-sm opacity-90">
                  {result.prediction === "Highly Fertile" && "Excellent soil quality with optimal nutrient levels for crop production."}
                  {result.prediction === "Fertile" && "Good soil quality suitable for most crop cultivation."}
                  {result.prediction === "Less Fertile" && "Soil may benefit from nutrient supplementation for better crop yield."}
                </p>
              </div>

              {/* AI Verification Section */}
              {result.ai_verification && !result.ai_verification.error && (
                <div className="bg-white border rounded-lg p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <h4 className="text-lg font-semibold text-gray-900">AI Expert Verification</h4>
                  </div>

                  {/* Agreement Status */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${
                      result.ai_verification.agreement_with_ml === "Agree" ? "bg-green-500" :
                      result.ai_verification.agreement_with_ml === "Partially Agree" ? "bg-yellow-500" : "bg-red-500"
                    }`}></div>
                    <span className="text-sm font-medium">
                      AI {result.ai_verification.agreement_with_ml?.toLowerCase() || "agrees"} with ML prediction
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      Confidence: {result.ai_verification.confidence || "Medium"}
                    </span>
                  </div>

                  {/* Key Observations */}
                  {result.ai_verification.key_observations && result.ai_verification.key_observations.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Key Observations:</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {result.ai_verification.key_observations.map((obs, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            {obs}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Nutrient Analysis */}
                  {result.ai_verification.nutrient_analysis && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {result.ai_verification.nutrient_analysis.strengths && result.ai_verification.nutrient_analysis.strengths.length > 0 && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <h6 className="font-medium text-green-800 mb-2">Strengths</h6>
                          <ul className="text-sm text-green-700 space-y-1">
                            {result.ai_verification.nutrient_analysis.strengths.map((strength, idx) => (
                              <li key={idx}>• {strength}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {result.ai_verification.nutrient_analysis.deficiencies && result.ai_verification.nutrient_analysis.deficiencies.length > 0 && (
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <h6 className="font-medium text-yellow-800 mb-2">Deficiencies</h6>
                          <ul className="text-sm text-yellow-700 space-y-1">
                            {result.ai_verification.nutrient_analysis.deficiencies.map((def, idx) => (
                              <li key={idx}>• {def}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {result.ai_verification.nutrient_analysis.concerns && result.ai_verification.nutrient_analysis.concerns.length > 0 && (
                        <div className="p-3 bg-red-50 rounded-lg">
                          <h6 className="font-medium text-red-800 mb-2">Concerns</h6>
                          <ul className="text-sm text-red-700 space-y-1">
                            {result.ai_verification.nutrient_analysis.concerns.map((concern, idx) => (
                              <li key={idx}>• {concern}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recommendations */}
                  {result.ai_verification.recommendations && result.ai_verification.recommendations.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Recommendations:</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {result.ai_verification.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Droplets className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suitable Crops */}
                  {result.ai_verification.suitable_crops && result.ai_verification.suitable_crops.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Suitable Crops:</h5>
                      <div className="flex flex-wrap gap-2">
                        {result.ai_verification.suitable_crops.map((crop, idx) => (
                          <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                            {crop}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detailed Explanation */}
                  {result.ai_verification.explanation && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h5 className="font-medium text-blue-900 mb-2">Expert Analysis:</h5>
                      <p className="text-sm text-blue-800">{result.ai_verification.explanation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* AI Verification Error */}
              {result.ai_verification?.error && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-600 text-sm">⚠️ AI verification unavailable: {result.ai_verification.error}</span>
                  </div>
                </div>
              )}
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
                <span className="text-sm font-medium">{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

