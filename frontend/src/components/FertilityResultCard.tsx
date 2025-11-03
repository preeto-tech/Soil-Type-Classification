import { motion } from "framer-motion"
import { CheckCircle, AlertCircle, TrendingUp, Sprout, Droplets, Zap } from "lucide-react"
import { Card, CardContent } from "./ui/card"

interface FertilityResultProps {
  fertilityLevel: string
  nutrients: {
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
  recommendations: string[]
}

export function FertilityResultCard({ fertilityLevel, nutrients, recommendations }: FertilityResultProps) {
  const getLevelColor = () => {
    if (fertilityLevel === "Highly Fertile") return "from-green-600 to-emerald-700"
    if (fertilityLevel === "Fertile") return "from-green-500 to-teal-600"
    return "from-yellow-500 to-orange-600"
  }

  const getLevelIcon = () => {
    if (fertilityLevel === "Highly Fertile") return <CheckCircle className="h-8 w-8" />
    if (fertilityLevel === "Fertile") return <TrendingUp className="h-8 w-8" />
    return <AlertCircle className="h-8 w-8" />
  }

  const getNutrientStatus = (value: number, key: string) => {
    // Simplified nutrient status logic
    const thresholds: Record<string, {low: number, high: number}> = {
      N: {low: 200, high: 400},
      P: {low: 5, high: 15},
      K: {low: 400, high: 800},
      ph: {low: 6, high: 7.5},
      ec: {low: 0.3, high: 1},
      oc: {low: 0.5, high: 1.5},
    }
    
    const threshold = thresholds[key]
    if (!threshold) return "optimal"
    
    if (value < threshold.low) return "low"
    if (value > threshold.high) return "high"
    return "optimal"
  }

  const primaryNutrients = [
    { key: "N", label: "Nitrogen", value: nutrients.N, unit: "kg/ha", icon: <Sprout className="h-5 w-5" /> },
    { key: "P", label: "Phosphorus", value: nutrients.P, unit: "kg/ha", icon: <Droplets className="h-5 w-5" /> },
    { key: "K", label: "Potassium", value: nutrients.K, unit: "kg/ha", icon: <Zap className="h-5 w-5" /> },
  ]

  const soilProperties = [
    { key: "ph", label: "pH Level", value: nutrients.ph, unit: "" },
    { key: "ec", label: "EC", value: nutrients.ec, unit: "dS/m" },
    { key: "oc", label: "Organic Carbon", value: nutrients.oc, unit: "%" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full space-y-4"
    >
      {/* Main Fertility Card */}
      <Card className={`bg-gradient-to-br ${getLevelColor()} text-white border-none shadow-lg overflow-hidden`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm opacity-90 font-medium">Fertility Analysis</p>
              <h3 className="text-3xl font-bold mt-1">{fertilityLevel}</h3>
            </div>
            <div className="bg-white/20 p-3 rounded-full">
              {getLevelIcon()}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mt-6">
            {primaryNutrients.map((nutrient) => (
              <div key={nutrient.key} className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1">
                  {nutrient.icon}
                  <span className="text-xs font-medium">{nutrient.label}</span>
                </div>
                <p className="text-2xl font-bold">{nutrient.value}</p>
                <p className="text-xs opacity-75">{nutrient.unit}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Soil Properties */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold text-sm mb-3 text-gray-700">Soil Properties</h4>
          <div className="grid grid-cols-3 gap-3">
            {soilProperties.map((prop) => (
              <div key={prop.key} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">{prop.label}</p>
                <p className="text-lg font-bold text-gray-900">{prop.value}</p>
                {prop.unit && <p className="text-xs text-gray-500">{prop.unit}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold text-sm mb-3 text-gray-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Recommendations
          </h4>
          <ul className="space-y-2">
            {recommendations.map((rec, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-2 text-sm text-gray-700"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2 flex-shrink-0" />
                <span>{rec}</span>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Secondary Nutrients */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold text-sm mb-3 text-gray-700">Micronutrients</h4>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "S", value: nutrients.S, unit: "ppm" },
              { label: "Zn", value: nutrients.zn, unit: "ppm" },
              { label: "Fe", value: nutrients.fe, unit: "ppm" },
              { label: "Cu", value: nutrients.cu, unit: "ppm" },
              { label: "Mn", value: nutrients.Mn, unit: "ppm" },
              { label: "B", value: nutrients.B, unit: "ppm" },
            ].map((micro) => (
              <div key={micro.label} className="bg-gray-50 rounded px-2 py-1.5">
                <p className="text-xs text-gray-600">{micro.label}</p>
                <p className="text-sm font-semibold text-gray-900">{micro.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

