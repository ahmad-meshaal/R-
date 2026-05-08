import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageLayout from "@/components/layout/PageLayout";
import NovelCard from "@/components/NovelCard";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const GENRES = ["الكل", "رومانسي", "خيال علمي", "رعب", "مغامرات", "تاريخي", "بوليسي"];
const SORTS = [
  { value: "latest", label: "الأحدث" },
  { value: "trending", label: "الأكثر قراءة" },
  { value: "top_rated", label: "الأعلى تقييماً" },
];

export default function DiscoverPage() {
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("الكل");
  const [sort, setSort] = useState("latest");
  const [q, setQ] = useState("");

  const params = new URLSearchParams({ sort });
  if (genre !== "الكل") params.set("genre", genre);
  if (q) params.set("search", q);

  const { data, isLoading } = useQuery({
    queryKey: ["novels", sort, genre, q],
    queryFn: () => apiFetch(`/novels?${params}`),
  });
  const novels = data?.novels ?? [];

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">اكتشف الروايات</h1>
          <p className="text-sm text-muted-foreground">روايات عربية من كتّاب موهوبين</p>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && setQ(search)}
              placeholder="ابحث عن رواية أو كاتب..."
              className="pr-10 border-2"
            />
          </div>
          <Button onClick={() => setQ(search)} className="border-2 px-5">بحث</Button>
        </div>

        {/* Filters — horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none -mx-4 px-4">
          {GENRES.map(g => (
            <Button key={g} size="sm" onClick={() => setGenre(g)}
              variant={genre === g ? "default" : "outline"}
              className={cn("border-2 flex-shrink-0 text-xs", genre === g ? "" : "")}>
              {g}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {SORTS.map(s => (
            <Button key={s.value} size="sm" onClick={() => setSort(s.value)}
              variant={sort === s.value ? "secondary" : "ghost"}
              className={cn("text-xs border-2", sort === s.value ? "border-foreground" : "border-transparent")}>
              {s.label}
            </Button>
          ))}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 bg-muted animate-pulse border-2 border-border" />
            ))}
          </div>
        ) : novels.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>لا توجد نتائج</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-4 font-mono">{data?.total ?? novels.length} نتيجة</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {novels.map((novel: any) => <NovelCard key={novel.id} novel={novel} />)}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
