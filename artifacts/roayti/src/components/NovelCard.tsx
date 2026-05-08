import { Link } from "wouter";
import { Heart, BookOpen, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface NovelCardProps {
  novel: {
    id: number;
    title: string;
    summary?: string | null;
    genre?: string | null;
    authorName: string;
    authorClerkId: string;
    coverImage?: string | null;
    likesCount: number;
    viewsCount: number;
    chaptersCount: number;
    isLiked?: boolean;
    status: string;
  };
  compact?: boolean;
}

const genreColors: Record<string, string> = {
  "رومانسي": "bg-pink-50 text-pink-700 border-pink-200",
  "خيال علمي": "bg-blue-50 text-blue-700 border-blue-200",
  "رعب": "bg-gray-100 text-gray-700 border-gray-300",
  "مغامرات": "bg-amber-50 text-amber-700 border-amber-200",
  "تاريخي": "bg-orange-50 text-orange-700 border-orange-200",
  "بوليسي": "bg-slate-50 text-slate-700 border-slate-200",
};

export default function NovelCard({ novel, compact }: NovelCardProps) {
  return (
    <Link href={`/novels/${novel.id}`}>
      <div className={cn(
        "brutal-card bg-card cursor-pointer overflow-hidden flex",
        compact ? "h-28" : "flex-col h-full"
      )}>
        {/* Cover */}
        <div className={cn(
          "bg-muted flex items-center justify-center flex-shrink-0 border-b-2 border-border",
          compact ? "w-20 h-full border-b-0 border-l-2" : "h-48"
        )}>
          {novel.coverImage ? (
            <img src={novel.coverImage} alt={novel.title} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground p-2">
              <BookOpen className={cn(compact ? "w-6 h-6" : "w-10 h-10")} />
              {!compact && <span className="text-xs text-center line-clamp-2 font-medium">{novel.title}</span>}
            </div>
          )}
        </div>

        {/* Content */}
        <div className={cn("p-3 flex flex-col gap-1 flex-1 min-w-0", compact && "justify-center")}>
          {novel.genre && (
            <span className={cn("text-xs px-1.5 py-0.5 border self-start font-mono uppercase tracking-wider", genreColors[novel.genre] || "bg-muted text-muted-foreground border-border")}>
              {novel.genre}
            </span>
          )}
          <h3 className={cn("font-bold leading-tight line-clamp-2", compact ? "text-sm" : "text-base")}>
            {novel.title}
          </h3>
          {!compact && novel.summary && (
            <p className="text-sm text-muted-foreground line-clamp-2">{novel.summary}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-1">
            <span className="truncate">{novel.authorName}</span>
            <span className="flex items-center gap-1 mr-auto">
              <Heart className="w-3 h-3" />
              {novel.likesCount}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {novel.chaptersCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
