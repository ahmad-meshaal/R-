import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Wand2, BookOpen, FileText, Image, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import PageLayout from "@/components/layout/PageLayout";
import { useApi } from "@/hooks/useApi";
import { cn } from "@/lib/utils";

const GENRES = ["رومانسي", "خيال علمي", "رعب", "مغامرات", "تاريخي", "بوليسي"];
const IMPROVE_MODES = [
  { value: "improve", label: "تحسين الأسلوب" },
  { value: "rewrite", label: "إعادة الكتابة" },
  { value: "proofread", label: "تدقيق لغوي" },
  { value: "shorten", label: "اختصار النص" },
  { value: "expand", label: "توسيع النص" },
];

type Tool = "outline" | "plot" | "chapter" | "improve" | "cover";

export default function AiToolsPage() {
  const { call } = useApi();
  const { toast } = useToast();
  const [activeTool, setActiveTool] = useState<Tool>("outline");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Form fields
  const [idea, setIdea] = useState("");
  const [genre, setGenre] = useState("");
  const [novelTitle, setNovelTitle] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [textToImprove, setTextToImprove] = useState("");
  const [improveMode, setImproveMode] = useState("improve");
  const [coverTitle, setCoverTitle] = useState("");
  const [coverSummary, setCoverSummary] = useState("");

  const { data: quota } = useQuery({
    queryKey: ["ai-quota"],
    queryFn: () => call("/ai/quota"),
  });

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      let res: any;
      switch (activeTool) {
        case "outline":
          res = await call("/ai/generate-outline", { method: "POST", body: JSON.stringify({ idea, genre }) });
          break;
        case "plot":
          res = await call("/ai/generate-plot", { method: "POST", body: JSON.stringify({ idea, genre }) });
          break;
        case "chapter":
          res = await call("/ai/generate-chapter", { method: "POST", body: JSON.stringify({ novelTitle, chapterTitle, genre }) });
          break;
        case "improve":
          res = await call("/ai/improve-text", { method: "POST", body: JSON.stringify({ text: textToImprove, mode: improveMode }) });
          break;
        case "cover":
          res = await call("/ai/generate-cover-prompt", { method: "POST", body: JSON.stringify({ title: coverTitle, genre, summary: coverSummary }) });
          break;
      }
      setResult(res);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const tools: { id: Tool; label: string; icon: React.ComponentType<any>; desc: string }[] = [
    { id: "outline", label: "هيكل الرواية", icon: BookOpen, desc: "ولّد هيكلاً كاملاً مع فصول" },
    { id: "plot", label: "الحبكة", icon: FileText, desc: "ابتكر حبكة روائية مفصلة" },
    { id: "chapter", label: "فصل كامل", icon: Wand2, desc: "أنشئ محتوى فصل كامل" },
    { id: "improve", label: "تحسين النص", icon: Sparkles, desc: "حسّن أسلوبك وراجع نصوصك" },
    { id: "cover", label: "غلاف الرواية", icon: Image, desc: "أنشئ غلافاً بالذكاء الاصطناعي" },
  ];

  const canRun = () => {
    switch (activeTool) {
      case "outline": case "plot": return idea.trim().length > 0;
      case "chapter": return novelTitle.trim().length > 0 && chapterTitle.trim().length > 0;
      case "improve": return textToImprove.trim().length > 0;
      case "cover": return coverTitle.trim().length > 0;
    }
  };

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="w-8 h-8" />
            أدوات الذكاء الاصطناعي
          </h1>
          {quota && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 max-w-xs">
                <div className="flex justify-between text-xs text-muted-foreground font-mono mb-1">
                  <span>الطلبات اليومية</span>
                  <span>{quota.used} / {quota.limit}</span>
                </div>
                <div className="h-2 bg-muted border border-border overflow-hidden">
                  <div
                    className={cn("h-full transition-all", quota.remaining === 0 ? "bg-destructive" : "bg-foreground")}
                    style={{ width: `${(quota.used / quota.limit) * 100}%` }}
                  />
                </div>
              </div>
              {quota.remaining === 0 && (
                <span className="text-xs text-destructive font-mono">انتهى الحد اليومي</span>
              )}
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Tool selector */}
          <div className="lg:col-span-1 space-y-2">
            {tools.map(t => (
              <button
                key={t.id}
                onClick={() => { setActiveTool(t.id); setResult(null); }}
                className={cn(
                  "w-full text-right p-4 border-2 transition-all flex items-center gap-3",
                  activeTool === t.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card hover:bg-accent"
                )}
              >
                <t.icon className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{t.label}</p>
                  <p className={cn("text-xs", activeTool === t.id ? "opacity-70" : "text-muted-foreground")}>{t.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Tool form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Outline / Plot */}
            {(activeTool === "outline" || activeTool === "plot") && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">فكرة الرواية *</label>
                  <Textarea
                    value={idea}
                    onChange={e => setIdea(e.target.value)}
                    placeholder="صف فكرة روايتك باختصار..."
                    className="border-2 resize-none"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">التصنيف</label>
                  <Select value={genre} onValueChange={setGenre}>
                    <SelectTrigger className="border-2">
                      <SelectValue placeholder="اختر التصنيف (اختياري)" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Chapter */}
            {activeTool === "chapter" && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">عنوان الرواية *</label>
                  <Input value={novelTitle} onChange={e => setNovelTitle(e.target.value)} placeholder="عنوان الرواية" className="border-2" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">عنوان الفصل *</label>
                  <Input value={chapterTitle} onChange={e => setChapterTitle(e.target.value)} placeholder="عنوان الفصل" className="border-2" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">التصنيف</label>
                  <Select value={genre} onValueChange={setGenre}>
                    <SelectTrigger className="border-2">
                      <SelectValue placeholder="اختر التصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Improve */}
            {activeTool === "improve" && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">النص المراد تحسينه *</label>
                  <Textarea
                    value={textToImprove}
                    onChange={e => setTextToImprove(e.target.value)}
                    placeholder="الصق النص هنا..."
                    className="border-2 resize-none"
                    rows={6}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">طريقة التحسين</label>
                  <Select value={improveMode} onValueChange={setImproveMode}>
                    <SelectTrigger className="border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMPROVE_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Cover */}
            {activeTool === "cover" && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">عنوان الرواية *</label>
                  <Input value={coverTitle} onChange={e => setCoverTitle(e.target.value)} placeholder="عنوان الرواية" className="border-2" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">التصنيف</label>
                  <Select value={genre} onValueChange={setGenre}>
                    <SelectTrigger className="border-2">
                      <SelectValue placeholder="اختر التصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">ملخص قصير</label>
                  <Textarea value={coverSummary} onChange={e => setCoverSummary(e.target.value)} placeholder="ملخص مختصر للرواية (اختياري)" className="border-2 resize-none" rows={3} />
                </div>
              </>
            )}

            <Button
              className="w-full gap-2 border-2 text-base"
              onClick={run}
              disabled={loading || !canRun() || quota?.remaining === 0}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  جاري التوليد...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  توليد
                </>
              )}
            </Button>

            {/* Result */}
            {result && (
              <div className="brutal-card bg-card p-6 space-y-4">
                <h3 className="font-bold text-lg border-b-2 border-border pb-3">النتيجة</h3>

                {activeTool === "outline" && result.title && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground uppercase mb-1">العنوان المقترح</p>
                      <p className="font-bold text-xl">{result.title}</p>
                    </div>
                    {result.summary && (
                      <div>
                        <p className="text-xs font-mono text-muted-foreground uppercase mb-1">الملخص</p>
                        <p className="text-sm leading-relaxed">{result.summary}</p>
                      </div>
                    )}
                    {result.chapters?.length > 0 && (
                      <div>
                        <p className="text-xs font-mono text-muted-foreground uppercase mb-2">الفصول ({result.chapters.length})</p>
                        <div className="space-y-2">
                          {result.chapters.map((ch: any) => (
                            <div key={ch.order} className="border-2 border-border p-3">
                              <p className="font-medium text-sm">{ch.order}. {ch.title}</p>
                              {ch.summary && <p className="text-xs text-muted-foreground mt-1">{ch.summary}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(activeTool === "plot" || activeTool === "chapter" || activeTool === "improve") && result.text && (
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 mb-3"
                      onClick={() => { navigator.clipboard.writeText(result.text); toast({ title: "تم النسخ!" }); }}
                    >
                      نسخ النص
                    </Button>
                    <pre className="whitespace-pre-wrap text-sm leading-loose font-sans">{result.text}</pre>
                  </div>
                )}

                {activeTool === "cover" && (
                  <div className="space-y-4">
                    {result.b64_json && (
                      <img
                        src={`data:${result.mimeType};base64,${result.b64_json}`}
                        alt="غلاف الرواية"
                        className="w-full max-w-xs mx-auto border-2 border-border"
                      />
                    )}
                    {result.prompt && (
                      <div>
                        <p className="text-xs font-mono text-muted-foreground mb-1">البرومبت المستخدم</p>
                        <p className="text-xs text-muted-foreground italic">{result.prompt}</p>
                      </div>
                    )}
                  </div>
                )}

                {result.remainingQuota !== undefined && (
                  <p className="text-xs text-muted-foreground font-mono border-t-2 border-border pt-3">
                    الطلبات المتبقية اليوم: {result.remainingQuota}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
