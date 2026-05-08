import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Save, Plus, Trash2, Sparkles, Eye, Globe,
  BookOpen, ArrowRight, Wand2, Menu, X as XIcon, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/hooks/useApi";
import { cn } from "@/lib/utils";

function useAutoSave(content: string, chapterId: string | null, save: (c: string) => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!chapterId) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(content), 2000);
    return () => clearTimeout(timer.current);
  }, [content]);
}

export default function EditorPage() {
  const { novelId, chapterId: chapterIdParam } = useParams<{ novelId: string; chapterId?: string }>();
  const { call } = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(
    chapterIdParam ? Number(chapterIdParam) : null
  );
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: novel } = useQuery({
    queryKey: ["novel", novelId],
    queryFn: () => call(`/novels/${novelId}`),
  });

  const { data: chapters = [], refetch: refetchChapters } = useQuery({
    queryKey: ["chapters", novelId],
    queryFn: () => call(`/novels/${novelId}/chapters`),
  });

  const { data: currentChapter } = useQuery({
    queryKey: ["chapter", novelId, selectedChapterId],
    queryFn: () => call(`/novels/${novelId}/chapters/${selectedChapterId}`),
    enabled: !!selectedChapterId,
  });

  useEffect(() => {
    if (currentChapter) {
      setChapterTitle(currentChapter.title ?? "");
      setChapterContent(currentChapter.content ?? "");
    }
  }, [currentChapter]);

  const saveChapter = useCallback(async (content: string) => {
    if (!selectedChapterId) return;
    setSaving(true);
    try {
      await call(`/novels/${novelId}/chapters/${selectedChapterId}`, {
        method: "PUT",
        body: JSON.stringify({ title: chapterTitle, content }),
      });
    } catch {} finally { setSaving(false); }
  }, [selectedChapterId, chapterTitle, call, novelId]);

  useAutoSave(chapterContent, selectedChapterId ? String(selectedChapterId) : null, saveChapter);

  const createChapter = useMutation({
    mutationFn: () => call(`/novels/${novelId}/chapters`, {
      method: "POST",
      body: JSON.stringify({ title: `الفصل ${chapters.length + 1}`, content: "", order: chapters.length + 1 }),
    }),
    onSuccess: (ch) => { refetchChapters(); setSelectedChapterId(ch.id); setSidebarOpen(false); },
  });

  const deleteChapter = useMutation({
    mutationFn: (id: number) => call(`/novels/${novelId}/chapters/${id}`, { method: "DELETE" }),
    onSuccess: () => { refetchChapters(); setSelectedChapterId(null); setChapterTitle(""); setChapterContent(""); },
  });

  const publishMutation = useMutation({
    mutationFn: () => call(`/novels/${novelId}/publish`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["novel", novelId] }); toast({ title: "تم النشر! روايتك متاحة الآن." }); },
  });

  const handleAI = async (mode: "generate" | "improve") => {
    if (!selectedChapterId) return;
    setAiLoading(true);
    try {
      let res: any;
      if (mode === "generate") {
        res = await call("/ai/generate-chapter", {
          method: "POST",
          body: JSON.stringify({ novelTitle: novel?.title, chapterTitle, genre: novel?.genre }),
        });
        setChapterContent(res.text ?? "");
      } else {
        if (!chapterContent.trim()) { toast({ title: "لا يوجد نص", variant: "destructive" }); return; }
        res = await call("/ai/improve-text", {
          method: "POST",
          body: JSON.stringify({ text: chapterContent, mode: "improve" }),
        });
        setChapterContent(res.text ?? chapterContent);
      }
      toast({ title: "تم!" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setAiLoading(false); setAiOpen(false); }
  };

  const wordCount = chapterContent.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="h-dvh flex flex-col bg-background" dir="rtl">
      {/* Top bar */}
      <header className="h-14 border-b-2 border-border flex items-center px-3 gap-2 flex-shrink-0 bg-background">
        <Link href="/my-novels">
          <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>

        {/* Chapter sidebar toggle (mobile) */}
        <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 md:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <XIcon className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>

        <div className="flex-1 min-w-0">
          <p className="font-bold truncate text-sm">{novel?.title ?? "..."}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {saving ? "حفظ..." : selectedChapterId ? "محفوظ ✓" : "اختر فصلاً"}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {selectedChapterId && (
            <>
              <Button size="sm" variant="outline" className="gap-1.5 border-2 h-8"
                onClick={() => setAiOpen(true)}>
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">ذكاء</span>
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                onClick={() => saveChapter(chapterContent)} disabled={saving}>
                <Save className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          {novel?.status !== "published" ? (
            <Button size="sm" className="gap-1.5 border-2 h-8"
              onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">نشر</span>
            </Button>
          ) : (
            <Link href={`/novels/${novelId}`}>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Eye className="w-3.5 h-3.5" /></Button>
            </Link>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-20 bg-background/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)} />
        )}

        {/* Chapters sidebar */}
        <aside className={cn(
          "flex flex-col border-l-2 border-border bg-sidebar flex-shrink-0 z-30 transition-transform duration-200",
          "md:relative md:translate-x-0 md:w-56",
          "fixed top-14 bottom-0 right-0 w-72",
          sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}>
          <div className="flex items-center justify-between px-3 py-2.5 border-b-2 border-border">
            <span className="text-sm font-medium">الفصول ({chapters.length})</span>
            <Button size="sm" variant="outline" className="h-7 gap-1 border-2 text-xs"
              onClick={() => createChapter.mutate()} disabled={createChapter.isPending}>
              <Plus className="w-3 h-3" />فصل
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {chapters.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-8">لا توجد فصول بعد</p>
            )}
            {chapters.map((ch: any, i: number) => (
              <button key={ch.id} onClick={() => { setSelectedChapterId(ch.id); setSidebarOpen(false); }}
                className={cn(
                  "w-full text-right px-3 py-2 text-sm border-2 transition-colors block",
                  selectedChapterId === ch.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-transparent hover:border-border hover:bg-accent"
                )}>
                <span className="font-mono text-xs opacity-50">{i + 1}.</span>
                <span className="mr-1.5 truncate">{ch.title}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Editor */}
        <main className="flex-1 overflow-y-auto">
          {!selectedChapterId ? (
            <div className="h-full flex items-center justify-center text-muted-foreground p-4">
              <div className="text-center">
                <BookOpen className="w-14 h-14 mx-auto mb-3 opacity-15" />
                <p className="font-medium mb-4">اختر فصلاً أو أنشئ فصلاً جديداً</p>
                <Button variant="outline" className="border-2 gap-2"
                  onClick={() => createChapter.mutate()} disabled={createChapter.isPending}>
                  <Plus className="w-4 h-4" />فصل جديد
                </Button>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto w-full px-4 sm:px-8 py-8">
              <div className="flex items-center gap-2 mb-6">
                <Input value={chapterTitle} onChange={e => setChapterTitle(e.target.value)}
                  className="text-lg font-bold border-0 border-b-2 rounded-none px-0 focus-visible:ring-0 bg-transparent flex-1"
                  placeholder="عنوان الفصل" />
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => { if (confirm("حذف هذا الفصل؟")) deleteChapter.mutate(selectedChapterId!); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <Textarea
                value={chapterContent}
                onChange={e => setChapterContent(e.target.value)}
                className="w-full min-h-[calc(100dvh-280px)] border-0 rounded-none p-0 focus-visible:ring-0 bg-transparent resize-none text-base leading-[2] font-sans"
                placeholder="ابدأ الكتابة هنا..."
                dir="rtl"
              />
              <div className="mt-4 text-xs text-muted-foreground font-mono flex items-center justify-between pt-4 border-t border-border/50">
                <span>{wordCount.toLocaleString("ar")} كلمة</span>
                <span>{chapterContent.length.toLocaleString("ar")} حرف</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* AI Dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="border-2 border-border max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4" />مساعد الذكاء الاصطناعي
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <Button className="w-full gap-2 border-2 justify-start text-sm" variant="outline"
              onClick={() => handleAI("generate")} disabled={aiLoading}>
              {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              توليد محتوى الفصل
            </Button>
            <Button className="w-full gap-2 border-2 justify-start text-sm" variant="outline"
              onClick={() => handleAI("improve")} disabled={aiLoading}>
              {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              تحسين النص الحالي
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
