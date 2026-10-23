import { z } from 'zod';
// Zod schemas for validation
export const BusinessInfoSchema = z.object({
    name: z.string().min(2, 'Nama bisnis minimal 2 karakter'),
    category: z.string().min(2, 'Kategori bisnis wajib diisi'),
    description: z.string().min(10, 'Deskripsi minimal 10 karakter'),
    location: z.string().min(2, 'Lokasi wajib diisi'),
    whatsapp: z.string().min(8, 'Nomor WhatsApp wajib diisi'),
    instagram: z.string().optional(),
    services: z.string().optional(),
    targetCustomer: z.string().optional(),
    preferredStyle: z.enum(['modern', 'minimalist', 'warm', 'bold', 'elegant']).default('modern'),
});
export const ThemeConfigSchema = z.object({
    primaryColor: z.string().default('#2563eb'),
    secondaryColor: z.string().default('#0f172a'),
    font: z.string().default('sans'),
    accentColor: z.string().optional(),
    backgroundColor: z.string().optional(),
});
export const SectionSchema = z.object({
    type: z.enum([
        'navbar',
        'hero',
        'about',
        'services',
        'features',
        'gallery',
        'testimonials',
        'cta',
        'contact',
        'footer',
    ]),
    content: z.record(z.string(), z.any()),
});
export const AiWebsiteResponseSchema = z.object({
    business: z.object({
        name: z.string(),
        category: z.string(),
        tagline: z.string().optional(),
        location: z.string(),
    }),
    theme: ThemeConfigSchema,
    sections: z.array(z.object({
        type: z.enum([
            'navbar',
            'hero',
            'about',
            'services',
            'features',
            'gallery',
            'testimonials',
            'cta',
            'contact',
            'footer',
        ]),
        content: z.record(z.string(), z.any()),
    })),
});
