import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, RefreshCw, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const TONES = [
  { value: "friendly", label: "😊 Friendly" },
  { value: "exciting", label: "🔥 Exciting" },
  { value: "informative", label: "📚 Informative" },
  { value: "urgent", label: "⚡ Urgent" },
  { value: "warm", label: "☕ Warm & cozy" },
];

const CONTEXTS = [
  { value: "flash_drop", label: "Flash Drop" },
  { value: "rewards", label: "Rewards / Points" },
  { value: "community", label: "Community" },
  { value: "coffee_fact", label: "Coffee Education" },
  { value: "general", label: "General Update" },
];

export default function AIContentGenerator({ onApply }) {
  const [idea, setIdea] = useState("");
  const [tone, setTone] = useState("friendly");
  const [context, setContext] = useState("general");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [expandedIdx, setExpandedIdx] = useState(null);

  const generate = async () => {
    if (!idea.trim()) {
      toast.error("Please enter an idea first");
      return;
    }
    setGenerating(true);
    setResults([]);
    setSelectedIdx(null);
    setExpandedIdx(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a push notification copywriter for "Bean" — a premium specialty coffee shop in Lahore, Pakistan that's building a loyal community app before launch.

Generate 3 different push notification variations for the following idea:
Idea: "${idea}"
Tone: ${tone}
Context category: ${context}

Rules:
- Title: max 60 characters, catchy, use 1 relevant emoji
- Body: max 180 characters, conversational, no salesy clichés, no "Buy now" or "Limited time offer" language
- Keep it authentic and brand-consistent with a premium coffee community vibe
- The app has: Points/Rewards, Flash Drops, Community posts, Leaderboard

Output a JSON object with a "variations" array of 3 items, each with: title (string), body (string), deep_link (string — one of: /Home, /Rewards, /FlashDrops, /Community, /Leaderboard).`,
        response_json_schema: {
          type: "object",
          properties: {
            variations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  body: { type: "string" },
                  deep_link: { type: "string" },
                }
              }
            }
          }
        }
      });
      const variations = res?.variations || [];
      if (!variations.length) throw new Error("No variations returned");
      setResults(variations);
      setExpandedIdx(0);
    } catch (e) {
      toast.error("Failed to generate: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = (variation) => {
    onApply({
      title: variation.title,
      body: variation.body,
      deepLink: variation.deep_link,
      audience: "all",
    });
    toast.success("Applied to Compose tab!");
  };

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">AI Content Generator</h2>
            <p className="text-white/70 text-sm">Drop your idea, get polished copy</p>
          </div>
        </div>
      </div>

      {/* Input card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Your Idea *</label>
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            placeholder="e.g. Remind users they have points expiring soon and encourage redemption"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Tone</label>
            <div className="flex flex-col gap-1">
              {TONES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`text-left text-xs px-3 py-2 rounded-xl border transition-all ${
                    tone === t.value
                      ? "border-purple-400 bg-purple-50 text-purple-700 font-semibold"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Context</label>
            <div className="flex flex-col gap-1">
              {CONTEXTS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setContext(c.value)}
                  className={`text-left text-xs px-3 py-2 rounded-xl border transition-all ${
                    context === c.value
                      ? "border-purple-400 bg-purple-50 text-purple-700 font-semibold"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button
          onClick={generate}
          disabled={generating}
          className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold"
        >
          {generating ? (
            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Generate 3 Variations</>
          )}
        </Button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className="text-xs font-semibold text-gray-500 px-1">✨ Pick a variation to use</p>
            {results.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`bg-white rounded-2xl border-2 transition-all ${
                  selectedIdx === i ? "border-purple-400 shadow-md" : "border-gray-100"
                }`}
              >
                {/* Header row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                >
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    selectedIdx === i ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{v.title}</p>
                    {expandedIdx !== i && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{v.body}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedIdx(i); handleApply(v); }}
                      className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      <Send className="h-3 w-3" /> Use
                    </button>
                    {expandedIdx === i
                      ? <ChevronUp className="h-4 w-4 text-gray-300" />
                      : <ChevronDown className="h-4 w-4 text-gray-300" />
                    }
                  </div>
                </div>

                {/* Expanded preview */}
                <AnimatePresence>
                  {expandedIdx === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
                        {/* Phone preview */}
                        <div className="bg-gray-800 rounded-2xl p-3">
                          <div className="bg-white/10 rounded-xl p-3 flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4C4B0] to-[#8B7355] flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-bold">B</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white leading-tight">{v.title}</p>
                              <p className="text-xs text-white/70 mt-0.5 leading-relaxed">{v.body}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>Title: {v.title.length}/60 chars</span>
                          <span>Body: {v.body.length}/180 chars</span>
                          <span className="bg-gray-100 px-2 py-0.5 rounded-full">{v.deep_link}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}

            {/* Regenerate */}
            <button
              onClick={generate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-purple-600 transition-colors py-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
              Generate new variations
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}