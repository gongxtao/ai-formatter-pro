// src/lib/ai/intent-classifier.ts

import { streamChatCompletion } from '@/lib/ai/llm-client';
import { PROMPT_TEMPLATES } from '@/config/prompt-templates';
import type { IntentClassificationResult } from '@/types/clarify';

const CONFIDENCE_THRESHOLD = 0.7;

const INTENT_CLASSIFICATION_SYSTEM = `You are a document type classifier. Analyze the user's request and determine the most appropriate document type.

Available types: ${Object.keys(PROMPT_TEMPLATES).join(', ')}

If you can confidently determine the type (confidence > ${CONFIDENCE_THRESHOLD}), respond with JSON:
{ "type": "resume", "confidence": 0.9 }

If the request is too vague or could match multiple types, respond with:
{ "needsClarification": true, "possibleTypes": ["resume", "coverLetter", "letter"] }

Respond ONLY with the JSON object, no other text.`;

/**
 * Classify user intent from their prompt
 */
export async function classifyIntent(prompt: string): Promise<IntentClassificationResult> {
  // Validate input
  if (!prompt?.trim()) {
    return { needsClarification: true };
  }

  try {
    const generator = await streamChatCompletion({
      model: 'kimi-k2.5', // Use fast model for classification
      messages: [
        { role: 'system', content: INTENT_CLASSIFICATION_SYSTEM },
        { role: 'user', content: prompt },
      ],
    });

    let accumulated = '';

    for await (const chunk of generator) {
      if (chunk.type === 'delta') {
        accumulated += chunk.data;
      } else if (chunk.type === 'error') {
        console.error('Intent classification error:', chunk.data);
        return { needsClarification: true };
      }
    }

    // Parse the JSON response
    const result = parseClassificationResult(accumulated);
    return result;

  } catch (error) {
    console.error('Intent classification failed:', error);
    return { needsClarification: true };
  }
}

/**
 * Parse classification result from LLM response
 */
function parseClassificationResult(response: string): IntentClassificationResult {
  const validTypes = Object.keys(PROMPT_TEMPLATES);
  const isValidType = (t: string): boolean => validTypes.includes(t);

  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { needsClarification: true };
    }

    const parsed = JSON.parse(jsonMatch[0]) as IntentClassificationResult;

    // Validate the result
    if (parsed.needsClarification) {
      const validPossibleTypes = (parsed.possibleTypes || []).filter(isValidType);
      return {
        needsClarification: true,
        possibleTypes: validPossibleTypes.length > 0 ? validPossibleTypes : [],
      };
    }

    if (parsed.type && typeof parsed.confidence === 'number') {
      // Validate the type is valid
      if (!isValidType(parsed.type)) {
        return { needsClarification: true };
      }

      // If confidence is high enough, return the type
      if (parsed.confidence >= 0.7) {
        return { type: parsed.type, confidence: parsed.confidence };
      }
      // Otherwise, need clarification
      return {
        needsClarification: true,
        possibleTypes: [parsed.type], // The single type is already validated
      };
    }

    return { needsClarification: true };

  } catch {
    return { needsClarification: true };
  }
}
