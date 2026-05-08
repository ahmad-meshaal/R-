import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { PenLine, Plus, BookOpen, Trash2, Eye, Globe, Edit3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const GENRES = ["رومانسي", "خيال علمي", "رعب", "مغامرات", "تاريخي", "بوليسي", "أخرى"];

function CreateNovelDialog({ onCreated }: { onCreated: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [genre, setGenre] = useState("");
  const { call } = useApi();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: () => call("/novels", {
      method: "POST",
      body: JSON.stringify({ title, summary, genre }),
    }),
    onSuccess: (novel) => {
      setOpen(false);
      setTitle(""); setSummary(""); setGenre("");
      onCreated(novel.id);
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 border-2">
          <Plus className="w-4 h-4" />
          رواية جديدة
        </Button>
      </DialogTrigger>
      <DialogContent className="border-2 border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">إنشاء رواية جديدة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-1 block">عنوان الرواية *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="أدخل عنوان الرواية" className="border-2" />
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
            <label className="text-sm font-medium mb-1 block">الملخص</label>
            <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="اكتب ملخصاً قصيراً للرواية" className="border-2 resize-none" rows={3} />
          </div>
          <Button
            className="w-full border-2"
            disabled={!title.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "جاري الإنشاء..." : "إنشاء الرواية"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MyNovelsPage() {
  const { call } = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useState(() => (id: number) => window.location.href = `/editor/${id}`);

  const { data: novels = [], isLoading } = useQuery({
    queryKey: ["my-novels"],
    queryFn: () => call("/novels/my"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => call(`/novels/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-novels"] }),
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => call(`/novels/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-novels"] });
      toast({ title: "تم النشر!", description: "روايتك متاحة الآن للقراء." });
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">رواياتي</h1>
            <p className="text-muted-foreground mt-1">{novels.length} رواية</p>
          </div>
          <CreateNovelDialog onCreated={(id) => { window.location.href = `/editor/${id}`; }} />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse border-2 border-border" />
            ))}
          </div>
        ) : novels.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border">
            <PenLine className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">لا توجد روايات بعد</h3>
            <p className="text-muted-foreground mb-6">ابدأ رحلتك الإبداعية وأنشئ روايتك الأولى</p>
            <CreateNovelDialog onCreated={(id) => { window.location.href = `/editor/${id}`; }} />
          </div>
        ) : (
          <div className="space-y-3">
            {novels.map((novel: any) => (
              <div key={novel.id} className="brutal-card bg-card p-4 flex items-center gap-4">
                {/* Status badge */}
                <div className={cn(
                  "w-2 h-16 flex-shrink-0",
                  novel.status === "published" ? "bg-green-500" : "bg-muted-foreground/30"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold truncate">{novel.title}</h3>
                    <span className={cn(
                      "text-xs px-2 py-0.5 border font-mono",
                      novel.status === "published" ? "border-green-500 text-green-700" : "border-border text-muted-foreground"
                    )}>
                      {novel.status === "published" ? "منشورة" : "مسودة"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{novel.summary || "بلا وصف"}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 font-mono">
                    <span>{novel.chaptersCount} فصل</span>
                    <span>{novel.genre || "—"}</span>
                    <span>{new Date(novel.updatedAt).toLocaleDateString("ar")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/editor/${novel.id}`}>
                    <Button size="sm" variant="outline" className="gap-1 border-2">
                      <Edit3 className="w-4 h-4" />
                      <span className="hidden sm:inline">تحرير</span>
                    </Button>
                  </Link>
                  {novel.status === "published" && (
                    <Link href={`/novels/${novel.id}`}>
                      <Button size="sm" variant="ghost" className="gap-1">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                  {novel.status !== "published" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-green-700"
                      onClick={() => publishMutation.mutate(novel.id)}
                      disabled={publishMutation.isPending}
                    >
                      <Globe className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-destructive"
                    onClick={() => {
                      if (confirm("هل تريد حذف هذه الرواية؟")) deleteMutation.mutate(novel.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI tools promo */}
        <div className="mt-10 brutal-card p-6 bg-foreground text-background">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-6 h-6" />
            <h3 className="font-bold text-lg">أدوات الذكاء الاصطناعي</h3>
          </div>
          <p className="text-background/80 mb-4">ولّد هيكل روايتك، أنشئ فصولاً كاملة، وحسّن نصوصك باستخدام الذكاء الاصطناعي.</p>
          <Link href="/ai-tools">
            <Button variant="secondary" className="border-2 border-background/30 gap-2">
              <Sparkles className="w-4 h-4" />
              استخدم الأدوات الآن
            </Button>
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
