/**
 * UnderFireAI - Segmind Image Generation
 *
 * Generates interview scene images using Segmind's API.
 * Uses SDXL for high-quality office environment renders.
 */

const SEGMIND_API_URL = 'https://api.segmind.com/v1/sdxl1.0-txt2img';

export interface SegmindGenerateParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  samples?: number;
  seed?: number;
}

export interface SegmindResponse {
  image: string; // base64 encoded image
  seed: number;
}

/**
 * Check if Segmind is configured
 */
export function isSegmindConfigured(): boolean {
  return !!process.env.SEGMIND_API_KEY;
}

/**
 * Generate an image using Segmind SDXL
 */
export async function generateImage(params: SegmindGenerateParams): Promise<SegmindResponse> {
  const apiKey = process.env.SEGMIND_API_KEY;

  if (!apiKey) {
    throw new Error('SEGMIND_API_KEY is not configured');
  }

  const {
    prompt,
    negativePrompt = 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, signature',
    width = 1024,
    height = 768,
    samples = 1,
    seed,
  } = params;

  const response = await fetch(SEGMIND_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: negativePrompt,
      style: 'base',
      samples,
      scheduler: 'UniPC',
      num_inference_steps: 25,
      guidance_scale: 7.5,
      strength: 0.75,
      seed: seed ?? Math.floor(Math.random() * 1000000),
      img_width: width,
      img_height: height,
      refiner: true,
      base64: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Segmind API error:', errorText);
    throw new Error(`Segmind API error: ${response.status}`);
  }

  const data = await response.json() as SegmindResponse;

  return {
    image: data.image,
    seed: data.seed ?? seed ?? 0,
  };
}

/**
 * Generate an interview scene image
 */
export async function generateSceneImage(
  sceneDescription: string,
  companyStyle: string
): Promise<{ base64: string; seed: number }> {
  const styleModifiers: Record<string, string> = {
    faang: 'modern tech office, silicon valley, glass walls, minimalist design, natural lighting',
    startup: 'casual startup office, open floor plan, exposed brick, industrial lighting, creative workspace',
    consulting: 'luxury corporate office, mahogany furniture, leather chairs, city skyline view, prestigious',
    enterprise: 'corporate headquarters, professional meeting room, neutral colors, formal setting',
    agency: 'creative agency studio, colorful decor, design awards, mood boards, artistic workspace',
    government: 'government office, formal institutional setting, flags, secure environment, official',
  };

  const styleContext = styleModifiers[companyStyle] || styleModifiers.enterprise;

  const prompt = `Professional photograph of an interview room, ${styleContext}. ${sceneDescription}. Photorealistic, high quality, detailed interior photography, architectural photography, 8k resolution, professional lighting`;

  const result = await generateImage({
    prompt,
    negativePrompt: 'people, humans, person, faces, cartoon, anime, illustration, painting, drawing, blurry, low quality, watermark, text',
    width: 1024,
    height: 768,
  });

  return {
    base64: result.image,
    seed: result.seed,
  };
}
