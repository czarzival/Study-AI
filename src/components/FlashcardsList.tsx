import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, RotateCw } from 'lucide-react';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty: string;
  times_reviewed: number;
}

interface FlashcardsListProps {
  searchQuery: string;
}

const FlashcardsList = ({ searchQuery }: FlashcardsListProps) => {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFlashcards();
    }
  }, [user]);

  const loadFlashcards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFlashcards(data);
    }
    setLoading(false);
  };

  const handleFlip = (cardId: string) => {
    setFlippedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
        // Update review count
        supabase
          .from('flashcards')
          .update({
            times_reviewed: flashcards.find((c) => c.id === cardId)!.times_reviewed + 1,
            last_reviewed_at: new Date().toISOString(),
          })
          .eq('id', cardId);
      }
      return newSet;
    });
  };

  const filteredFlashcards = flashcards.filter(
    (card) =>
      card.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading flashcards...</div>
      </div>
    );
  }

  if (filteredFlashcards.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchQuery
              ? 'No flashcards found matching your search'
              : 'No flashcards yet. Upload a document to generate study cards!'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredFlashcards.map((card) => {
        const isFlipped = flippedCards.has(card.id);
        return (
          <Card
            key={card.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            onClick={() => handleFlip(card.id)}
          >
            <CardContent className="p-6 min-h-[200px] flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <Badge variant={card.difficulty === 'hard' ? 'destructive' : 'secondary'}>
                  {card.difficulty}
                </Badge>
                <RotateCw className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex-1 flex items-center justify-center text-center">
                {isFlipped ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Answer:</p>
                    <p className="text-foreground font-medium">{card.answer}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Question:</p>
                    <p className="text-foreground font-medium">{card.question}</p>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground text-center mt-4">
                Reviewed {card.times_reviewed} times
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default FlashcardsList;
