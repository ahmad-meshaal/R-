import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { BookOpen, Trash2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/layout/PageLayout";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function LibraryPage() {
  const { call } = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["library"],
    queryFn: () => call("/library"),
  });

  const removeMutation = useMutation({
    mutationFn: (novelId: number) => call(`/library/${novelId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library"] }),
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">مكتبتي</h1>
          <p className="text-muted-foreground mt-1">{items.length} رواية محفوظة</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse border-2 border-border" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">مكتبتك فارغة</h3>
            <p className="text-muted-foreground mb-6">استكشف الروايات وأضف المفضلة إلى مكتبتك</p>
            <Link href="/discover">
              <Button className="gap-2 border-2">اكتشف الروايات</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item: any) => {
              const novel = item.novel;
              if (!novel) return null;
              return (
                <div key={item.id} className="brutal-card bg-card p-4 flex items-center gap-4">
                  {/* Cover */}
                  <div className="w-16 h-20 flex-shrink-0 bg-muted border-2 border-border flex items-center justify-center overflow-hidden">
                    {novel.coverImage ? (
                      <img src={novel.coverImage} alt={novel.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">{novel.title}</h3>
                    <p className="text-sm text-muted-foreground">{novel.authorName}</p>
                    {/* Progress bar */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono mb-1">
                        <span>التقدم</span>
                        <span>{item.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-muted border border-border overflow-hidden">
                        <div
                          className="h-full bg-foreground transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {novel.chaptersCount > 0 && (
                      <Link href={`/novels/${novel.id}`}>
                        <Button size="sm" className="gap-1 border-2">
                          <BookOpen className="w-4 h-4" />
                          <span className="hidden sm:inline">تابع</span>
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => removeMutation.mutate(novel.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
