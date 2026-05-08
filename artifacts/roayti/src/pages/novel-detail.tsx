import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, BookOpen, Eye, Plus, ChevronLeft, User, Lock } from "lucide-react";
import { useAuth, Show, SignInButton } from "@clerk/react";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/layout/PageLayout";
import { apiFetch } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { cn } from "@/lib/utils";

export default function NovelDetailPage() {
  const { novelId } = useParams<{ novelId: string }>();
  const { isSignedIn } = useAuth();
  const { call } = useApi();
  const qc = useQueryClient();

  const { data: novel, isLoading } = useQuery({
    queryKey: ["novel", novelId],
    queryFn: () => apiFetch(`/novels/${novelId}`),
  });

  const likeMutation = useMutation({
    mutationFn: () => call(`/novels/${novelId}/like`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["novel", novelId] }),
  });

  const libraryMutation = useMutation({
    mutationFn: () =>
      novel?.inLibrary
        ? call(`/library/${novelId}`, { method: "DELETE" })
        : call(`/library/${novelId}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["novel", novelId] }),
  });

  if (isLoading) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
          <div className="h-60 bg-muted animate-pulse border-2 border-border" />
          <div className="h-8 bg-muted animate-pulse w-3/4" />
        </div>
      </PageLayout>
    );
  }

  if (!novel) {
    return <PageLayout><div className="text-center py-20 text-muted-foreground">رواية غير موجودة</div></PageLayout>;
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex gap-6 mb-8 flex-col sm:flex-row">
          <div className="w-full sm:w-40 h-56 flex-shrink-0 brutal-card bg-muted flex items-center justify-center overflow-hidden">
            {novel.coverImage ? (
              <img src={novel.coverImage} alt={novel.title} className="w-full h-full object-cover" />
            ) : (
              <BookOpen className="w-16 h-16 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-start gap-2 flex-wrap mb-2">
              {novel.genre && (
                <span className="text-xs px-2 py-0.5 border-2 border-border font-mono uppercase">{novel.genre}</span>
              )}
              <span className={cn("text-xs px-2 py-0.5 border-2 font-mono uppercase",
                novel.status === "published" ? "border-green-500 text-green-700" : "border-border text-muted-foreground")}>
                {novel.status === "published" ? "منشورة" : "مسودة"}
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{novel.title}</h1>
            <Link href={`/profile/${novel.authorClerkId}`}>
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 cursor-pointer">
                <User className="w-4 h-4" />
                <span>{novel.authorName}</span>
              </div>
            </Link>
            {novel.summary && <p className="text-sm leading-relaxed text-muted-foreground mb-4">{novel.summary}</p>}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-1"><Heart className="w-4 h-4" />{novel.likesCount}</span>
              <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{novel.viewsCount}</span>
              <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{novel.chapters?.length ?? 0} فصل</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              {novel.chapters?.length > 0 && (
                <Link href={`/novels/${novelId}/chapters/${novel.chapters[0]?.id}`}>
                  <Button className="gap-2 border-2">
                    <BookOpen className="w-4 h-4" />
                    {novel.readingProgress ? "تابع القراءة" : "ابدأ القراءة"}
                  </Button>
                </Link>
              )}
              <Show when="signed-in">
                <Button variant="outline" className={cn("gap-2 border-2", novel.isLiked && "bg-accent")}
                  onClick={() => likeMutation.mutate()} disabled={likeMutation.isPending}>
                  <Heart className={cn("w-4 h-4", novel.isLiked && "fill-current")} />
                  {novel.isLiked ? "أعجبني" : "إعجاب"}
                </Button>
                <Button variant="outline" className="gap-2 border-2"
                  onClick={() => libraryMutation.mutate()} disabled={libraryMutation.isPending}>
                  <Plus className="w-4 h-4" />
                  {novel.inLibrary ? "في المكتبة ✓" : "أضف للمكتبة"}
                </Button>
              </Show>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <Button variant="outline" className="gap-2 border-2">
                    <Lock className="w-4 h-4" />
                    سجّل دخولك للتفاعل
                  </Button>
                </SignInButton>
              </Show>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 pb-3 border-b-2 border-border">الفصول ({novel.chapters?.length ?? 0})</h2>
          {!novel.chapters?.length ? (
            <p className="text-muted-foreground text-center py-8">لا توجد فصول بعد</p>
          ) : (
            <div className="space-y-2">
              {novel.chapters.map((ch: any, i: number) => (
                <Link key={ch.id} href={`/novels/${novelId}/chapters/${ch.id}`}>
                  <div className="flex items-center gap-4 p-4 border-2 border-border hover:bg-accent transition-colors cursor-pointer group">
                    <span className="font-mono text-sm text-muted-foreground w-6 text-center">{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium group-hover:font-bold transition-all">{ch.title}</p>
                      {ch.wordCount > 0 && <p className="text-xs text-muted-foreground">{ch.wordCount?.toLocaleString("ar")} كلمة</p>}
                    </div>
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
