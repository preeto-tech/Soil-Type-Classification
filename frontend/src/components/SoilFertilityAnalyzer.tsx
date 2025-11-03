import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Droplets, Loader2, Check, Sparkles, RotateCcw } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
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
  message?: string
}

const nutrients = [
  { key: "N" as keyof SoilData, label: "Nitrogen (N)", description: "NH4+ ratio", unit: "kg/ha" },
  { key: "P" as keyof SoilData, label: "Phosphorous (P)", description: "P content", unit: "kg/ha" },
  { key: "K" as keyof SoilData, label: "Potassium (K)", description: "K content", unit: "kg/ha" },
  { key: "ph" as keyof SoilData, label: "pH", description: "Soil acidity", unit: "" },
  { key: "ec" as keyof SoilData, label: "EC", description: "Electrical conductivity", unit: "dS/m" },
  { key: "oc" as keyof SoilData, label: "OC", description: "Organic carbon", unit: "%" },
  { key: "S" as keyof SoilData, label: "Sulfur (S)", description: "Sulfur content", unit: "ppm" },
  { key: "zn" as keyof SoilData, label: "Zinc (Zn)", description: "Zinc content", unit: "ppm" },
  { key: "fe" as keyof SoilData, label: "Iron (Fe)", description: "Iron content", unit: "ppm" },
  { key: "cu" as keyof SoilData, label: "Copper (Cu)", description: "Copper content", unit: "ppm" },
  { key: "Mn" as keyof SoilData, label: "Manganese (Mn)", description: "Manganese content", unit: "ppm" },
  { key: "B" as keyof SoilData, label: "Boron (B)", description: "Boron content", unit: "ppm" },
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
  const [result, setResult] = useState<FertilityResult | null>(null)
  const [error, setError] = useState<string | null>(null)

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
          Soil Fertility Analyzer
        </CardTitle>
        <CardDescription>
          Enter soil nutrient data to predict fertility level
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-3">
          <Button
            onClick={handleSampleData}
            variant="outline"
            size="sm"
            type="button"
          >
            <Sparkles className="h-4 w-4" />
            Fill Sample Data
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            type="button"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        <form onSubmit={handlePredict} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nutrients.map((nutrient) => (
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
                Analyzing Fertility...
              </>
            ) : (
              "Analyze Soil Fertility"
            )}
          </Button>
        </form>

        <AnimatePresence>
          {result && result.status === "Success" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-6 rounded-lg bg-gradient-to-br ${getFertilityColor(result.prediction)} text-white shadow-lg`}
            >
              <div className="flex items-center gap-3 mb-2">
                {getFertilityIcon(result.prediction)}
                <span className="text-sm font-medium opacity-90">Fertility Assessment</span>
              </div>
              <h3 className="text-3xl font-bold mb-2">{result.prediction}</h3>
              <p className="text-sm opacity-90">
                {result.prediction === "Highly Fertile" && "Excellent soil quality with optimal nutrient levels for crop production."}
                {result.prediction === "Fertile" && "Good soil quality suitable for most crop cultivation."}
                {result.prediction === "Less Fertile" && "Soil may benefit from nutrient supplementation for better crop yield."}
              </p>
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

