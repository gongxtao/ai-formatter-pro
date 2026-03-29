// src/lib/ai/intent-classifier.ts

import { streamChatCompletion } from '@/lib/ai/llm-client';
import { VALID_DOCUMENT_TYPES } from '@/lib/ai/prompt-builder';
import type { IntentClassificationResult } from '@/types/clarify';

const VALID_TYPES = VALID_DOCUMENT_TYPES;

/**
 * Get default classification result
 * If category is provided and valid, assume user already selected a type
 */
export function getDefaultResult(category?: string | null): IntentClassificationResult {
  const isValidCategory = category && VALID_TYPES.includes(category);

  if (isValidCategory) {
    return {
      readyToGenerate: false, // Still need to check content sufficiency
      category: category,
      confidence: 0.5,
      reason: 'insufficient_content',
    };
  }

  return {
    readyToGenerate: false,
    confidence: 0,
    reason: 'unknown_type',
  };
}

const INTENT_CLASSIFICATION_SYSTEM = `You are an intent classifier for a document generation system. Your job is to determine if the user wants to generate a document and if they have provided enough information.

Available document types: ${VALID_TYPES.join(', ')}

Analyze the conversation and the latest user input. Respond with a JSON object.

**IMPORTANT: You will receive the full conversation history. The last message is the user's latest input.**

Consider:

1. **Intent Detection**: Is the user trying to generate a document?
   - Look for keywords like: "生成", "创建", "写", "帮我", "generate", "create", "write", "make", "help me with", "I need a"
   - Even vague requests like "I want a resume" or "帮我写份简历" indicate document generation intent
   - If the user confirms they want a specific document type in the conversation, intent is clear

2. **Content Sufficiency**: Has the user provided enough information to generate?
   - Sufficient: The user has specified a document type AND given some context (even minimal)
   - If user says "帮我生成一份简历" or "生成一份商业计划" - this IS sufficient, set readyToGenerate: true
   - If user asks clarifying questions or provides more details - intent is still clear
   - Only insufficient if the user hasn't specified any document type at all

3. **Type Detection**: What type of document does the user want?
   - Match against available types: ${VALID_TYPES.join(', ')}
   - Common mappings:
     - "简历" → resume
     - "商业计划" → businessPlan
     - "报告" → report
     - "提案" → proposal
     - "白皮书" → whitePaper
     - "求职信" → coverLetter
     - "手册" → manual

Response format:
{
  "readyToGenerate": boolean,  // true if intent is clear AND type is detected
  "category": "type" | null,   // detected document type (use English key like "resume", "businessPlan")
  "confidence": 0.0-1.0,       // confidence in the classification
  "reason": null | "unclear_intent" | "insufficient_content" | "unknown_type",
  "suggestedQuestion": "question to ask if clarification needed" | null,
  "quickReplies": ["option1", "option2"] | null
}

Guidelines:
- Be AGGRESSIVE in detecting readyToGenerate - if user mentions any document type, set it to true
- If user says "生成X" or "帮我写X" where X is a document type, readyToGenerate: true
- If conversation shows user confirmed they want a specific document, readyToGenerate: true
- Only set readyToGenerate: false if you truly cannot determine what document type they want

Respond ONLY with the JSON object, no other text.`;

/**
 * Classify user intent from their prompt
 * @param prompt - User's input text
 * @param category - Optional pre-selected category (if user already chose a type)
 */
export async function classifyIntent(
  prompt: string,
  category?: string | null,
): Promise<IntentClassificationResult> {
  // Validate input
  if (!prompt?.trim()) {
    return {
      readyToGenerate: false,
      confidence: 0,
      reason: 'insufficient_content',
      suggestedQuestion: 'Please describe what document you would like to generate.',
    };
  }

  // If category is provided and valid, include it in the context
  const categoryContext = category && VALID_TYPES.includes(category)
    ? `\n\nNote: The user has already selected the document type "${category}". Trust this selection and focus on whether the provided content is sufficient to generate the document.`
    : '';

  try {
    const generator = await streamChatCompletion({
      model: 'kimi-k2.5', // Use fast model for classification
      messages: [
        { role: 'system', content: INTENT_CLASSIFICATION_SYSTEM + categoryContext },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent classification
    });

    let accumulated = '';

    for await (const chunk of generator) {
      if (chunk.type === 'delta') {
        accumulated += chunk.data;
      } else if (chunk.type === 'error') {
        console.error('Intent classification error:', chunk.data);
        return getDefaultResult(category);
      }
    }

    // Parse the JSON response
    const result = parseClassificationResult(accumulated, category);
    return result;

  } catch (error) {
    console.error('Intent classification failed:', error);
    return getDefaultResult(category);
  }
}

/**
 * Parse classification result from LLM response
 */
function parseClassificationResult(
  response: string,
  providedCategory?: string | null,
): IntentClassificationResult {
  const isValidType = (t: string): boolean => VALID_TYPES.includes(t);

  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getDefaultResult(providedCategory);
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      readyToGenerate?: boolean;
      category?: string | null;
      confidence?: number;
      reason?: 'unclear_intent' | 'insufficient_content' | 'unknown_type' | null;
      suggestedQuestion?: string | null;
      quickReplies?: string[] | null;
    };

    // Build the result
    const result: IntentClassificationResult = {
      readyToGenerate: parsed.readyToGenerate ?? false,
      confidence: parsed.confidence ?? 0.5,
    };

    // Handle category
    if (providedCategory && isValidType(providedCategory)) {
      // Trust the provided category
      result.category = providedCategory;
    } else if (parsed.category && isValidType(parsed.category)) {
      result.category = parsed.category;
    }

    // Handle reason
    if (parsed.reason) {
      result.reason = parsed.reason;
    } else if (!result.readyToGenerate) {
      // Infer reason if not ready
      if (!result.category) {
        result.reason = 'unknown_type';
      } else {
        result.reason = 'insufficient_content';
      }
    }

    // Handle suggested question
    if (parsed.suggestedQuestion) {
      result.suggestedQuestion = parsed.suggestedQuestion;
    }

    // Handle quick replies
    if (parsed.quickReplies && Array.isArray(parsed.quickReplies)) {
      result.quickReplies = parsed.quickReplies.slice(0, 4); // Limit to 4 quick replies
    }

    // Add legacy fields for backward compatibility
    if (result.category) {
      result.type = result.category;
    }
    if (!result.readyToGenerate) {
      result.needsClarification = true;
      if (result.category) {
        result.possibleTypes = [result.category];
      }
    }

    return result;

  } catch (parseError) {
    console.error('Failed to parse classification result:', parseError);
    return getDefaultResult(providedCategory);
  }
}
