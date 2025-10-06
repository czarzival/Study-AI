import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface DocumentUploadProps {
  onUploadComplete: () => void;
}

const DocumentUpload = ({ onUploadComplete }: DocumentUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !content) {
      toast({
        title: 'Missing information',
        description: 'Please provide both title and content',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    try {
      // Insert document
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user!.id,
          title,
          content,
          file_type: 'text',
          status: 'processing',
        })
        .select()
        .single();

      if (docError) throw docError;

      // Generate notes and flashcards
      const { data: result, error: funcError } = await supabase.functions.invoke('generate-notes', {
        body: { documentId: document.id, content },
      });

      if (funcError) throw funcError;

      // Update document status
      await supabase
        .from('documents')
        .update({ status: 'completed' })
        .eq('id', document.id);

      toast({
        title: 'Success!',
        description: 'Notes and flashcards generated successfully',
      });

      setTitle('');
      setContent('');
      onUploadComplete();
    } catch (error: any) {
      console.error('Error processing document:', error);
      toast({
        title: 'Processing failed',
        description: error.message || 'Failed to process document',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Upload Study Material
        </CardTitle>
        <CardDescription>
          Paste your lecture notes or study material to generate AI-powered summaries and flashcards
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Introduction to Machine Learning"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={processing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <textarea
              id="content"
              className="w-full min-h-[300px] p-3 rounded-md border border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Paste your lecture notes, study material, or any text you want to learn from..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={processing}
            />
          </div>

          <Button type="submit" className="w-full" disabled={processing}>
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Notes & Flashcards
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default DocumentUpload;
