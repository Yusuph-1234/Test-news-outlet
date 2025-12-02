import axios from 'axios';

// Simple AI abstraction. Uses a generic OpenAI-compatible API.
// Configure via: AI_API_URL, AI_API_KEY, AI_MODEL

export async function summarizeAndClassifyArticle({ title, content, url, source }) {
  if (!process.env.AI_API_URL || !process.env.AI_API_KEY || !process.env.AI_MODEL) {
    // Fallback: return a naive summary and tag as non-breaking.
    return {
      summary: content.slice(0, 280) + (content.length > 280 ? '...' : ''),
      isBreaking: false,
      tags: [],
    };
  }

  const prompt = buildPrompt({ title, content, url, source });

  const { data } = await axios.post(
    process.env.AI_API_URL,
    {
      model: process.env.AI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are an assistant that extracts factual, concise breaking news summaries. Only mark items as breaking if they are timely, impactful, and widely relevant.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const text = data?.choices?.[0]?.message?.content || '';

  try {
    const parsed = JSON.parse(text);
    return {
      summary: parsed.summary,
      isBreaking: !!parsed.isBreaking,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch (err) {
    // If model returned plain text, just treat it as a summary.
    return {
      summary: text || content.slice(0, 280),
      isBreaking: false,
      tags: [],
    };
  }
}

function buildPrompt({ title, content, url, source }) {
  return `You are given a news article. Return a JSON object with keys: summary (string <= 60 words), isBreaking (boolean), tags (array of 2-6 short topical tags).

Title: ${title}
Source: ${source}
URL: ${url}

Content:
${content.slice(0, 4000)}
`;
}
