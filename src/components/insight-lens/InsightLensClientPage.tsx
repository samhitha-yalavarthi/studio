"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import Image from 'next/image';
import { analyzeImageContent, AnalyzeImageContentOutput } from '@/ai/flows/analyze-image-content';
import { answerQuestionAboutImage, AnswerQuestionAboutImageOutput } from '@/ai/flows/answer-question-about-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, Sparkles, MessageCircle, Loader2, AlertTriangle } from 'lucide-react';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function InsightLensClientPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  
  const [analysisResult, setAnalysisResult] = useState<AnalyzeImageContentOutput | null>(null);
  const [question, setQuestion] = useState<string>('');
  const [answer, setAnswer] = useState<AnswerQuestionAboutImageOutput | null>(null);
  
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState<boolean>(false);
  
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    // Clean up object URL
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setAnalysisResult(null);
    setAnswer(null);
    setQuestion('');

    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
        toast({
          title: 'Upload Error',
          description: `File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`,
          variant: 'destructive',
        });
        setImageFile(null);
        setImagePreviewUrl(null);
        setImageDataUri(null);
        event.target.value = ''; // Reset file input
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Invalid file type. Please upload an image.');
        toast({
          title: 'Upload Error',
          description: 'Invalid file type. Please upload an image (e.g., JPG, PNG, GIF).',
          variant: 'destructive',
        });
        setImageFile(null);
        setImagePreviewUrl(null);
        setImageDataUri(null);
        event.target.value = ''; // Reset file input
        return;
      }
      
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);

      // Convert to data URI for AI flow
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageDataUri(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreviewUrl(null);
      setImageDataUri(null);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!imageDataUri) {
      setError('Please upload an image first.');
      toast({ title: 'Error', description: 'Please upload an image first.', variant: 'destructive' });
      return;
    }
    
    setIsLoadingAnalysis(true);
    setError(null);
    setAnalysisResult(null);
    setAnswer(null);

    try {
      const result = await analyzeImageContent({ photoDataUri: imageDataUri });
      setAnalysisResult(result);
    } catch (err) {
      console.error('Error analyzing image:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during image analysis.';
      setError(errorMessage);
      toast({ title: 'Analysis Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleAskQuestion = async (event: FormEvent) => {
    event.preventDefault();
    if (!imageDataUri || !analysisResult) {
      setError('Please analyze an image first.');
      toast({ title: 'Error', description: 'Please analyze an image first.', variant: 'destructive' });
      return;
    }
    if (!question.trim()) {
      setError('Please enter a question.');
      toast({ title: 'Error', description: 'Please enter a question.', variant: 'destructive' });
      return;
    }
    
    setIsLoadingAnswer(true);
    setError(null);
    setAnswer(null);

    try {
      const result = await answerQuestionAboutImage({
        photoDataUri: imageDataUri,
        question: question,
        detectedObjects: analysisResult.imageDescription, 
      });
      setAnswer(result);
    } catch (err) {
      console.error('Error asking question:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while getting the answer.';
      setError(errorMessage);
      toast({ title: 'Q&A Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoadingAnswer(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <Upload className="mr-2 h-6 w-6" />
            Upload Image
          </CardTitle>
          <CardDescription>Select an image file to analyze and ask questions about.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="image-upload" className="text-base">Choose Image</Label>
            <Input 
              id="image-upload" 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange} 
              className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            <p className="text-sm text-muted-foreground mt-1">Max file size: {MAX_FILE_SIZE_MB}MB. Supported formats: JPG, PNG, GIF, etc.</p>
          </div>

          {imagePreviewUrl && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/50">
              <h3 className="text-lg font-semibold mb-2">Image Preview</h3>
              <Image 
                src={imagePreviewUrl} 
                alt="Image preview" 
                width={400} 
                height={300} 
                className="rounded-md object-contain max-h-[400px] w-auto shadow-md"
                data-ai-hint="uploaded image"
              />
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleAnalyzeImage} 
            disabled={!imageFile || isLoadingAnalysis}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoadingAnalysis ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Analyze Image
          </Button>
        </CardFooter>
      </Card>

      {isLoadingAnalysis && (
        <Card className="shadow-md">
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
            <p className="text-lg">Analyzing image...</p>
          </CardContent>
        </Card>
      )}

      {analysisResult && (
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl text-primary">
              <Sparkles className="mr-2 h-6 w-6" />
              Image Analysis
            </CardTitle>
            <CardDescription>
              This is the AI's understanding of the image content. This description will be used to answer your questions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              readOnly 
              value={analysisResult.imageDescription} 
              className="min-h-[100px] text-base bg-muted/30" 
              aria-label="Image analysis description"
            />
          </CardContent>
        </Card>
      )}

      {analysisResult && (
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl text-primary">
              <MessageCircle className="mr-2 h-6 w-6" />
              Ask a Question
            </CardTitle>
            <CardDescription>Ask anything about the analyzed image.</CardDescription>
          </CardHeader>
          <form onSubmit={handleAskQuestion}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="question-input" className="text-base">Your Question</Label>
                <Input 
                  id="question-input"
                  type="text" 
                  value={question} 
                  onChange={(e) => setQuestion(e.target.value)} 
                  placeholder="e.g., What color is the car?" 
                  className="mt-1 text-base"
                  disabled={isLoadingAnswer}
                />
              </div>
              {isLoadingAnswer && (
                <div className="flex items-center text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Getting your answer...</span>
                </div>
              )}
              {answer && (
                <div>
                  <Label className="text-base font-semibold">AI's Answer:</Label>
                  <Textarea 
                    readOnly 
                    value={answer.answer} 
                    className="mt-1 min-h-[80px] text-base bg-muted/30"
                    aria-label="AI's answer to your question"
                  />
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                disabled={isLoadingAnswer || !question.trim()}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {isLoadingAnswer ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="mr-2 h-4 w-4" />
                )}
                Ask Question
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
      
      {error && (
         <Card className="border-destructive bg-destructive/10 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              An Error Occurred
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
