import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Book, Chapter } from "@/data/books";

interface SearchResult {
  chapterNumber: number;
  chapterTitle: string;
  excerpt: string;
  matchStart: number;
}

interface BookSearchProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
}

// Generate chapter content (same as Read page)
function getChapterContent(chapterNumber: number): string {
  const paragraphs = [
    `The morning light filtered through the curtains, casting long shadows across the room. It was in moments like these that the true nature of things revealed itself, slowly and deliberately, like a flower unfurling its petals to greet the sun.`,
    `There was something profound about beginnings, about the way they carried within them the seeds of everything that would follow. Every story, every journey, every transformation started with a single moment of decision, a turning point that would only become visible in hindsight.`,
    `The path ahead was unclear, shrouded in the mist of uncertainty that accompanies all great endeavors. But clarity, as they say, comes not from seeing the whole journey at once, but from taking the first step and trusting that the next will reveal itself in time.`,
    `"Understanding," the old master had once said, "is not something you achieve. It is something that achieves you, when you have finally stopped trying to grasp it." These words echoed now, carrying new meaning with each passing day.`,
    `The landscape stretched endlessly before them, a canvas of possibility painted in hues of amber and gold. Each hill, each valley, held its own story, its own secrets waiting to be discovered by those patient enough to listen.`,
    `Time, that most mysterious of companions, seemed to move differently here. Minutes stretched into hours, hours condensed into moments, and in between, something essential was happening—a transformation too subtle to name but too significant to ignore.`,
    `There were lessons everywhere for those who knew how to look. In the way the river carved its path through stone, not with force but with persistence. In the way the trees bent with the wind rather than against it. In the way silence could speak louder than any words.`,
    `The characters in this chapter of life were many and varied. Some appeared briefly, leaving impressions that would last forever. Others stayed longer, their presence woven into the very fabric of the narrative. And some were yet to arrive, their entrances still waiting in the wings.`,
    `As the day progressed, new revelations came to light. What had seemed certain became questionable. What had been overlooked emerged as crucial. The story was writing itself, and all one could do was pay attention and participate with an open heart.`,
    `Evening approached, bringing with it the contemplative quiet that follows a day of discovery. The questions remained, as they always do, but they felt different now—less like obstacles and more like invitations to go deeper, to understand more fully, to embrace the mystery rather than solve it.`,
    `And so the chapter drew to its close, not with answers but with a deeper appreciation for the questions. Tomorrow would bring new challenges, new insights, new opportunities for growth. But for now, this moment was enough—this pause between what was and what was yet to be.`,
  ];
  return paragraphs.join(" ");
}

export default function BookSearch({ book, isOpen, onClose }: BookSearchProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];

    const searchResults: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    book.chapters.forEach((chapter) => {
      const content = getChapterContent(chapter.number);
      const lowerContent = content.toLowerCase();
      
      let searchStart = 0;
      let matchIndex: number;

      while ((matchIndex = lowerContent.indexOf(lowerQuery, searchStart)) !== -1) {
        // Get excerpt around the match
        const excerptStart = Math.max(0, matchIndex - 40);
        const excerptEnd = Math.min(content.length, matchIndex + query.length + 60);
        let excerpt = content.slice(excerptStart, excerptEnd);
        
        if (excerptStart > 0) excerpt = "..." + excerpt;
        if (excerptEnd < content.length) excerpt = excerpt + "...";

        searchResults.push({
          chapterNumber: chapter.number,
          chapterTitle: chapter.title,
          excerpt,
          matchStart: matchIndex - excerptStart + (excerptStart > 0 ? 3 : 0),
        });

        searchStart = matchIndex + 1;
        
        // Limit results per chapter
        if (searchResults.filter(r => r.chapterNumber === chapter.number).length >= 3) {
          break;
        }
      }
    });

    return searchResults.slice(0, 20); // Limit total results
  }, [query, book.chapters]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm animate-in fade-in-0">
      <div className="fixed inset-x-4 top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl">
        <div className="bg-background border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <Input
              autoFocus
              placeholder="Search in this book..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 p-0 h-auto text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="flex-shrink-0"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Results */}
          <ScrollArea className="max-h-[60vh]">
            {query.length < 2 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>Type at least 2 characters to search</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No results found for "{query}"</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {results.map((result, index) => (
                  <Link
                    key={`${result.chapterNumber}-${index}`}
                    to={`/read/${book.id}?chapter=${result.chapterNumber}`}
                    onClick={onClose}
                    className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground mb-1">
                        Chapter {result.chapterNumber}: {result.chapterTitle}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        <HighlightedText 
                          text={result.excerpt} 
                          query={query} 
                        />
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {results.length > 0 && (
            <div className="p-3 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                Found {results.length} result{results.length !== 1 ? "s" : ""} across {new Set(results.map(r => r.chapterNumber)).size} chapter{new Set(results.map(r => r.chapterNumber)).size !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Component to highlight search matches
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
