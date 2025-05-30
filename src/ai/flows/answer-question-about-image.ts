'use server';
/**
 * @fileOverview A flow that answers questions about an image based on detected objects and scenes.
 *
 * - answerQuestionAboutImage - A function that handles the question answering process.
 * - AnswerQuestionAboutImageInput - The input type for the answerQuestionAboutImage function.
 * - AnswerQuestionAboutImageOutput - The return type for the answerQuestionAboutImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerQuestionAboutImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to analyze, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  question: z.string().describe('The question to ask about the image.'),
  detectedObjects: z.string().describe('The detected objects in the image.'),
});
export type AnswerQuestionAboutImageInput = z.infer<typeof AnswerQuestionAboutImageInputSchema>;

const AnswerQuestionAboutImageOutputSchema = z.object({
  answer: z.string().describe('The answer to the question about the image.'),
});
export type AnswerQuestionAboutImageOutput = z.infer<typeof AnswerQuestionAboutImageOutputSchema>;

export async function answerQuestionAboutImage(input: AnswerQuestionAboutImageInput): Promise<AnswerQuestionAboutImageOutput> {
  return answerQuestionAboutImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerQuestionAboutImagePrompt',
  input: {schema: AnswerQuestionAboutImageInputSchema},
  output: {schema: AnswerQuestionAboutImageOutputSchema},
  prompt: `You are an AI assistant that answers questions about images. You are given an image and a list of detected objects in the image. You will use this information to answer the question about the image.

Question: {{{question}}}

Detected Objects: {{{detectedObjects}}}

Image: {{media url=photoDataUri}}`,
});

const answerQuestionAboutImageFlow = ai.defineFlow(
  {
    name: 'answerQuestionAboutImageFlow',
    inputSchema: AnswerQuestionAboutImageInputSchema,
    outputSchema: AnswerQuestionAboutImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
