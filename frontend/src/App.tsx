import { useState } from "react"
import { motion } from "framer-motion"
import { Leaf, Github, Info, MessageCircle, Languages } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs"
import { SoilTypeClassifier } from "./components/SoilTypeClassifier"
import { SoilFertilityAnalyzer } from "./components/SoilFertilityAnalyzer"
import { ChatBot } from "./components/ChatBot"
import { useLanguage } from "./context/LanguageContext"

function App() {
  const [activeTab, setActiveTab] = useState("classifier")
  const { t, language, setLanguage } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="p-2 bg-primary rounded-lg">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("appTitle")}</h1>
                <p className="text-sm text-gray-600">{t("appSubtitle")}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLanguage(language === "en" ? "hi" : "en")}
                  className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2 px-3 py-1 rounded-md hover:bg-gray-100"
                  title={t("selectLanguage")}
                >
                  <Languages className="h-5 w-5" />
                  <span className="text-sm font-medium">{language === "en" ? "हिंदी" : "English"}</span>
                </button>
              </div>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 text-center"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            {t("tagline")}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t("description")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-5xl mx-auto">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="classifier" className="text-base">
                {t("soilTypeClassification")}
              </TabsTrigger>
              <TabsTrigger value="fertility" className="text-base">
                {t("fertilityAnalysis")}
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                {t("aiAssistant")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="classifier">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <SoilTypeClassifier />
              </motion.div>
            </TabsContent>

            <TabsContent value="fertility">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <SoilFertilityAnalyzer />
              </motion.div>
            </TabsContent>

            <TabsContent value="chat">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <ChatBot />
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 max-w-5xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-lg border shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{t("accurateAnalysis")}</h3>
              </div>
              <p className="text-sm text-gray-600">
                {t("accurateAnalysisDesc")}
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg border shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Leaf className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{t("instantResults")}</h3>
              </div>
              <p className="text-sm text-gray-600">
                {t("instantResultsDesc")}
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg border shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Leaf className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{t("easyToUse")}</h3>
              </div>
              <p className="text-sm text-gray-600">
                {t("easyToUseDesc")}
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>{t("footerText")}</p>
            <p className="mt-1">{t("copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
