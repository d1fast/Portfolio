import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Работы. Один кейс = папка src/content/work/<slug>/ с ru.md и en.md,
// медиа лежат в public/work/<slug>/. Тело файла: разделы «Задача», «Решения», «Результат».
const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    year: z.number(),
    order: z.number().default(0),
    role: z.string(),
    stack: z.array(z.string()),
    /** Обложка для карточки и OG (путь от корня сайта, без base). */
    cover: z.string(),
    coverAlt: z.string(),
    /** Видео-превью карточки: mp4 и webm, постер. */
    video: z.object({ mp4: z.string(), webm: z.string(), poster: z.string() }).optional(),
    /** Галерея кейса. */
    media: z
      .array(z.object({ src: z.string(), alt: z.string(), caption: z.string().optional(), kind: z.enum(['image', 'video']).default('image'), portrait: z.boolean().default(false) }))
      .default([]),
    link: z.string().url().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { work };
