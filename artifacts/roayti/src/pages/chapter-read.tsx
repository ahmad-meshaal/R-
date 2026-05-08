import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ChevronLeft, BookOpen, MessageCircle, Send } from "lucide-react";
import { useAuth, Show, SignInButton } from "@clerk/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PageLayout from "@/components/layout/PageLayout";
import { apiFetch } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

export default function ChapterReadPage() {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
  const { isSignedIn } = useAuth();
  const { call } = useApi();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: novel } = useQuery({
    queryKey: ["novel", novelId],
    queryFn: () => apiFetch(`/novels/${novelId}`),
  });

  const { data: chapter, isLoading } = useQuery({
    queryKey: ["chapter", novelId, chapterId],
    queryFn: () => apiFetch(`/novels/${novelId}/chapters/${chapterId}`),
  });

  useEffect(() => {
    if (isSignedIn && novel?.inLibrary && chapter) {
      const chapters = novel?.chapters ?? [];
      const idx = chapters.findIndex((c: any) => String(c.id) === chapterId);
      const progress = chapters.length > 0 ? Math.round(((idx + 1) / chapters.length) * 100) : 0;
      call(`/library/${novelId}/progress`, {
        method: "PUT",
        body: JSON.stringify({ lastReadChapterId: Number(chapterId), progress }),
      }).catch(() => {});
    }
  }, [isSignedIn, novel, chapter, chapterId]);

  const commentMutation = useMutation({
    mutationFn: () => call(`/novels/${novelId}/chapters/${chapterId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content: comment }),
    }),
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["chapter", novelId, chapterId] });
    },
  });

  const chapters = novel?.chapters ?? [];
  const currentIdx = chapters.findIndex((c: any) => String(c.id) === chapterId);
  const prevChapter = currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const nextChapter = currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;

  if (isLoading) {
    return (
      <PageLayout>
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <div className="h-8 bg-muted animate-pulse w-3/4" />
          <div className="h-4 bg-muted animate-pulse" />
          <div className="h-4 bg-muted animate-pulse w-4/5" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href={`/novels/${novelId}`}>
            <span className="hover:text-foreground cursor-pointer">{novel?.title}</span>
          </Link>
          <ChevronLeft className="w-4 h-4" />
          <span>{chapter?.title}</span>
        </div>

        <div className="border-b-2 border-border pb-6 mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-2">
            <BookOpen className="w-4 h-4" />
            الفصل {currentIdx + 1} من {chapters.length}
          </div>
          <h1 className="text-3xl font-bold">{chapter?.title}</h1>
          {chapter?.wordCount > 0 && (
            <p className="text-sm text-muted-foreground mt-2">{chapter.wordCount?.toLocaleString("ar")} كلمة</p>
          )}
        </div>

        <div className="prose prose-lg max-w-none mb-12 leading-loose text-foreground whitespace-pre-wrap font-sans">
          {chapter?.content || <span className="text-muted-foreground italic">لا يوجد محتوى بعد</span>}
        </div>

        <div className="flex justify-between items-center border-y-2 border-border py-4 mb-10">
          {prevChapter ? (
            <Link href={`/novels/${novelId}/chapters/${prevChapter.id}`}>
              <Button variant="outline" className="gap-2 border-2"><ChevronRight className="w-4 h-4" />الفصل السابق</Button>
            </Link>
          ) : <div />}
          <Link href={`/novels/${novelId}`}>
            <Button variant="ghost" size="sm">فهرس الفصول</Button>
          </Link>
          {nextChapter ? (
            <Link href={`/novels/${novelId}/chapters/${nextChapter.id}`}>
              <Button className="gap-2 border-2">الفصل التالي<ChevronLeft className="w-4 h-4" /></Button>
            </Link>
          ) : <div />}
        </div>

        <div>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            التعليقات ({chapter?.comments?.length ?? 0})
          </h2>

          <Show when="signed-in">
            <div className="flex gap-3 mb-8">
              <Textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="اكتب تعليقك..." className="border-2 resize-none" rows={3} />
              <Button onClick={() => commentMutation.mutate()} disabled={!comment.trim() || commentMutation.isPending}
                className="self-end border-2"><Send className="w-4 h-4" /></Button>
            </div>
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="outline" className="gap-2 border-2 mb-8 w-full">سجّل دخولك للتعليق</Button>
            </SignInButton>
          </Show>

          <div className="space-y-4">
            {(chapter?.comments ?? []).map((c: any) => (
              <div key={c.id} className="border-2 border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  {c.userPhoto ? (
                    <img src={c.userPhoto} alt={c.userName} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 bg-muted border-2 border-border flex items-center justify-center text-xs font-bold">
                      {c.userName?.[0]}
                    </div>
                  )}
                  <span className="font-medium text-sm">{c.userName}</span>
                  <span className="text-xs text-muted-foreground mr-auto font-mono">
                    {new Date(c.createdAt).toLocaleDateString("ar")}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
