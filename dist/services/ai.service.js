import { GoogleGenAI } from '@google/genai';
import { ENV } from '../config/env.js';
export async function generateWebsiteWithGemini(businessInfo) {
    const apiKey = ENV.GEMINI_API_KEY;
    const categoryImages = {
        coffee: [
            'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
        ],
        barber: [
            'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80',
        ],
        laundry: [
            'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=1200&q=80',
        ],
        food: [
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
        ],
        service: [
            'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80',
        ],
    };
    const stylePalettes = {
        modern: { primaryColor: '#2563eb', secondaryColor: '#0f172a', font: 'sans', accentColor: '#38bdf8', backgroundColor: '#f8fafc' },
        minimalist: { primaryColor: '#18181b', secondaryColor: '#71717a', font: 'sans', accentColor: '#09090b', backgroundColor: '#fafafa' },
        warm: { primaryColor: '#b45309', secondaryColor: '#1c1917', font: 'sans', accentColor: '#f59e0b', backgroundColor: '#fffbeb' },
        bold: { primaryColor: '#dc2626', secondaryColor: '#111827', font: 'sans', accentColor: '#f97316', backgroundColor: '#fef2f2' },
        elegant: { primaryColor: '#0f766e', secondaryColor: '#134e4a', font: 'serif', accentColor: '#14b8a6', backgroundColor: '#f0fdfa' },
    };
    const chosenStyle = businessInfo.preferredStyle || 'modern';
    const defaultTheme = stylePalettes[chosenStyle] || stylePalettes.modern;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Anda adalah copywriter dan web designer landing page kelas dunia untuk UMKM Indonesia.
Tugas Anda adalah menghasilkan konten landing page profesional, persuasif, berbahasa Indonesia yang memikat calon pelanggan.

Informasi Usaha:
- Nama: ${businessInfo.name}
- Kategori: ${businessInfo.category}
- Deskripsi: ${businessInfo.description}
- Lokasi: ${businessInfo.location}
- WhatsApp: ${businessInfo.whatsapp}
- Instagram: ${businessInfo.instagram || '-'}
- Layanan/Produk: ${businessInfo.services || '-'}
- Target Pasar: ${businessInfo.targetCustomer || '-'}
- Gaya Visual: ${chosenStyle}

Instruksi:
Hasilkan JSON murni (tanpa markdown backticks \`\`\`json) dengan format:
{
  "tagline": "Slogan singkat catchy",
  "hero": {
    "badge": "Badge kecil di atas judul",
    "title": "Headline persuasif yang kuat",
    "description": "Subheadline jelas menjawab kebutuhan pelanggan",
    "buttonText": "Teks CTA WhatsApp"
  },
  "about": {
    "title": "Tentang Kami",
    "story": "Kisah singkat dan komitmen kualitas bisnis ini",
    "highlights": ["Keunggulan 1", "Keunggulan 2", "Keunggulan 3"]
  },
  "services": [
    {
      "title": "Nama Layanan/Produk 1",
      "description": "Deskripsi singkat manfaatnya",
      "price": "Mulai Rp 50.000"
    },
    {
      "title": "Nama Layanan/Produk 2",
      "description": "Deskripsi singkat manfaatnya",
      "price": "Mulai Rp 75.000"
    },
    {
      "title": "Nama Layanan/Produk 3",
      "description": "Deskripsi singkat manfaatnya",
      "price": "Mulai Rp 100.000"
    }
  ],
  "features": [
    { "title": "Keunggulan 1", "description": "Penjelasan mengapa pelanggan harus memilih Anda" },
    { "title": "Keunggulan 2", "description": "Penjelasan mengapa pelanggan harus memilih Anda" },
    { "title": "Keunggulan 3", "description": "Penjelasan mengapa pelanggan harus memilih Anda" }
  ],
  "testimonials": [
    { "name": "Pelanggan 1", "role": "Warga Lokal", "comment": "Ulasan kepuasan pelanggan yang terdengar natural dan autentik", "rating": 5 },
    { "name": "Pelanggan 2", "role": "Pelanggan Setia", "comment": "Ulasan pengalaman positif pelayanan terbaik", "rating": 5 }
  ],
  "cta": {
    "title": "Ajakan bertindak pamungkas yang mendesak",
    "description": "Keterangan kontak mudah via WhatsApp",
    "buttonText": "Hubungi via WhatsApp Sekarang"
  }
}`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            const rawText = response.text?.trim() || '{}';
            const cleanJson = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            const aiData = JSON.parse(cleanJson);
            const catLower = businessInfo.category.toLowerCase();
            let heroImg = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80';
            let aboutImg = 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80';
            if (catLower.includes('kopi') || catLower.includes('cafe') || catLower.includes('coffee')) {
                heroImg = categoryImages.coffee[0];
                aboutImg = categoryImages.coffee[1];
            }
            else if (catLower.includes('barber') || catLower.includes('cukur') || catLower.includes('salon')) {
                heroImg = categoryImages.barber[0];
                aboutImg = categoryImages.barber[1];
            }
            else if (catLower.includes('laundry') || catLower.includes('cuci')) {
                heroImg = categoryImages.laundry[0];
                aboutImg = categoryImages.laundry[1];
            }
            else if (catLower.includes('bengkel') || catLower.includes('service') || catLower.includes('motor')) {
                heroImg = categoryImages.service[0];
                aboutImg = categoryImages.service[1];
            }
            const waClean = businessInfo.whatsapp.replace(/\D/g, '');
            const waUrl = `https://wa.me/${waClean}?text=Halo%20${encodeURIComponent(businessInfo.name)},%20saya%20tertarik%20dengan%20layanan%20Anda.`;
            return {
                business: {
                    name: businessInfo.name,
                    category: businessInfo.category,
                    tagline: aiData.tagline || businessInfo.description,
                    location: businessInfo.location,
                },
                theme: defaultTheme,
                sections: [
                    {
                        type: 'navbar',
                        content: {
                            brandName: businessInfo.name,
                            links: [
                                { label: 'Tentang Kami', href: '#about' },
                                { label: 'Layanan', href: '#services' },
                                { label: 'Keunggulan', href: '#features' },
                                { label: 'Kontak', href: '#contact' },
                            ],
                            ctaText: 'Hubungi Kami',
                            ctaUrl: waUrl,
                            phone: businessInfo.whatsapp,
                        },
                    },
                    {
                        type: 'hero',
                        content: {
                            badge: aiData.hero?.badge || 'Solusi Terbaik untuk Anda',
                            title: aiData.hero?.title || `${businessInfo.name} - Pilihan Tepat untuk Anda`,
                            description: aiData.hero?.description || businessInfo.description,
                            buttonText: aiData.hero?.buttonText || 'Chat WhatsApp',
                            buttonUrl: waUrl,
                            imageUrl: heroImg,
                            alignment: 'center',
                        },
                    },
                    {
                        type: 'about',
                        content: {
                            badge: 'Tentang Usaha',
                            title: aiData.about?.title || `Tentang ${businessInfo.name}`,
                            story: aiData.about?.story || businessInfo.description,
                            imageUrl: aboutImg,
                            highlights: aiData.about?.highlights || ['Pelayanan Ramah & Cepat', 'Harga Terjangkau & Transparan', 'Berpengalaman & Terpercaya'],
                        },
                    },
                    {
                        type: 'services',
                        content: {
                            badge: 'Layanan & Menu',
                            title: 'Layanan Unggulan Kami',
                            subtitle: 'Kualitas terbaik dengan harga bersahabat khusus untuk Anda',
                            items: (aiData.services || []).map((s, idx) => ({
                                id: `svc_${idx + 1}`,
                                title: s.title,
                                description: s.description,
                                price: s.price,
                                icon: 'CheckCircle',
                            })),
                        },
                    },
                    {
                        type: 'features',
                        content: {
                            badge: 'Keunggulan',
                            title: `Mengapa Memilih ${businessInfo.name}?`,
                            subtitle: 'Komitmen kami memberikan pengalaman terbaik',
                            items: (aiData.features || []).map((f, idx) => ({
                                id: `feat_${idx + 1}`,
                                title: f.title,
                                description: f.description,
                                icon: 'Star',
                            })),
                        },
                    },
                    {
                        type: 'testimonials',
                        content: {
                            badge: 'Ulasan Pelanggan',
                            title: 'Apa Kata Mereka?',
                            subtitle: 'Pengalaman nyata dari pelanggan setia kami',
                            items: (aiData.testimonials || []).map((t, idx) => ({
                                id: `testi_${idx + 1}`,
                                name: t.name,
                                role: t.role || 'Pelanggan',
                                comment: t.comment,
                                rating: t.rating || 5,
                            })),
                        },
                    },
                    {
                        type: 'cta',
                        content: {
                            badge: 'Jangan Ragu',
                            title: aiData.cta?.title || 'Siap Mendapatkan Layanan Terbaik?',
                            description: aiData.cta?.description || 'Konsultasi gratis atau booking sekarang juga via WhatsApp.',
                            buttonText: aiData.cta?.buttonText || 'Chat Sekarang',
                            buttonUrl: waUrl,
                        },
                    },
                    {
                        type: 'contact',
                        content: {
                            badge: 'Hubungi Kami',
                            title: 'Kunjungi Tempat Kami',
                            description: 'Kami selalu siap menyambut kedatangan Anda dengan hangat.',
                            address: businessInfo.location,
                            phone: businessInfo.whatsapp,
                            whatsapp: businessInfo.whatsapp,
                            instagram: businessInfo.instagram,
                            operatingHours: 'Setiap Hari: 08.00 - 21.00 WIB',
                        },
                    },
                    {
                        type: 'footer',
                        content: {
                            brandName: businessInfo.name,
                            tagline: aiData.tagline || 'Pilihan terpercaya untuk kebutuhan Anda.',
                            copyrightText: `© ${new Date().getFullYear()} ${businessInfo.name}. All rights reserved.`,
                            socialLinks: [
                                { platform: 'whatsapp', url: waUrl },
                                ...(businessInfo.instagram ? [{ platform: 'instagram', url: `https://instagram.com/${businessInfo.instagram.replace('@', '')}` }] : []),
                            ],
                        },
                    },
                ],
            };
        }
        catch (err) {
            console.warn('Gemini API call failed, falling back to smart heuristic generator:', err);
        }
    }
    const waClean = businessInfo.whatsapp.replace(/\D/g, '');
    const waUrl = `https://wa.me/${waClean}?text=Halo%20${encodeURIComponent(businessInfo.name)},%20saya%20tertarik%20dengan%20layanan%20Anda.`;
    return {
        business: {
            name: businessInfo.name,
            category: businessInfo.category,
            tagline: `Solusi Terbaik untuk ${businessInfo.category}`,
            location: businessInfo.location,
        },
        theme: defaultTheme,
        sections: [
            {
                type: 'navbar',
                content: {
                    brandName: businessInfo.name,
                    links: [
                        { label: 'Tentang Kami', href: '#about' },
                        { label: 'Layanan', href: '#services' },
                        { label: 'Keunggulan', href: '#features' },
                        { label: 'Kontak', href: '#contact' },
                    ],
                    ctaText: 'Pesan Sekarang',
                    ctaUrl: waUrl,
                    phone: businessInfo.whatsapp,
                },
            },
            {
                type: 'hero',
                content: {
                    badge: `Pelayanan Terbaik di ${businessInfo.location}`,
                    title: `${businessInfo.name} - Pilihan Unggulan Keluarga & Profesional`,
                    description: businessInfo.description,
                    buttonText: 'Hubungi Kami via WhatsApp',
                    buttonUrl: waUrl,
                    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
                    alignment: 'center',
                },
            },
            {
                type: 'about',
                content: {
                    badge: 'Tentang Usaha',
                    title: `Selamat Datang di ${businessInfo.name}`,
                    story: `${businessInfo.name} hadir dengan dedikasi tinggi menghadirkan kualitas terbaik bagi masyarakat di ${businessInfo.location}. Setiap layanan kami berikan dengan sepenuh hati dan standar tertinggi.`,
                    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
                    highlights: ['Pelayanan Ramah & Responsif', 'Harga Terjangkau & Transparan', 'Kualitas Terjamin & Bergaransi'],
                },
            },
            {
                type: 'services',
                content: {
                    badge: 'Pilihan Menu & Layanan',
                    title: 'Layanan Unggulan Kami',
                    subtitle: 'Beragam opsi terbaik yang siap memanjakan dan memenuhi kebutuhan Anda',
                    items: [
                        {
                            id: 'svc_1',
                            title: 'Paket Spesial Unggulan',
                            description: 'Paket favorit pelanggan dengan kepuasan maksimal.',
                            price: 'Mulai Rp 50.000',
                            icon: 'Star',
                        },
                        {
                            id: 'svc_2',
                            title: 'Layanan Reguler Harian',
                            description: 'Solusi harian praktis, cepat, dan ekonomis.',
                            price: 'Mulai Rp 25.000',
                            icon: 'CheckCircle',
                        },
                        {
                            id: 'svc_3',
                            title: 'Layanan Custom & Eksklusif',
                            description: 'Penanganan khusus sesuai dengan permintaan spesifik Anda.',
                            price: 'Konsultasi Gratis',
                            icon: 'Sparkles',
                        },
                    ],
                },
            },
            {
                type: 'features',
                content: {
                    badge: 'Mengapa Kami?',
                    title: `Keunggulan ${businessInfo.name}`,
                    subtitle: 'Alasan mengapa ratusan pelanggan setia memilih kami',
                    items: [
                        { id: 'f1', title: 'Terpercaya & Berpengalaman', description: 'Didukung oleh tenaga berpengalaman di bidangnya.', icon: 'Award' },
                        { id: 'f2', title: 'Pemesanan Cepat via WA', description: 'Cukup klik tombol WhatsApp, kami langsung membalas pesanan Anda.', icon: 'Zap' },
                        { id: 'f3', title: 'Lokasi Strategis & Nyaman', description: `Mudah dijangkau di kawasan ${businessInfo.location}.`, icon: 'MapPin' },
                    ],
                },
            },
            {
                type: 'testimonials',
                content: {
                    badge: 'Kepuasan Pelanggan',
                    title: 'Kata Pelanggan Setia Kami',
                    subtitle: 'Ulasan asli dari mereka yang telah merasakan pelayanan terbaik',
                    items: [
                        { id: 't1', name: 'Rian Pratama', role: 'Pelanggan Lokal', comment: 'Pelayanan ramah sekali, hasilnya sangat memuaskan. Pasti jadi langganan tetap!', rating: 5 },
                        { id: 't2', name: 'Dewi Lestari', role: 'Pelanggan', comment: 'Respons via WhatsApp super cepat dan ramah. Sangat direkomendasikan untuk warga sekitar!', rating: 5 },
                    ],
                },
            },
            {
                type: 'cta',
                content: {
                    badge: 'Hubungi Sekarang',
                    title: `Yuk, Kunjungi atau Pesan di ${businessInfo.name}!`,
                    description: 'Jangan ragu menghubungi kami untuk informasi lebih lanjut atau booking jadwal.',
                    buttonText: 'Chat via WhatsApp',
                    buttonUrl: waUrl,
                },
            },
            {
                type: 'contact',
                content: {
                    badge: 'Info Kontak',
                    title: 'Hubungi Kami Langsung',
                    description: 'Kami siap melayani kebutuhan Anda setiap hari.',
                    address: businessInfo.location,
                    phone: businessInfo.whatsapp,
                    whatsapp: businessInfo.whatsapp,
                    instagram: businessInfo.instagram,
                    operatingHours: 'Buka Setiap Hari: 08.00 - 21.00 WIB',
                },
            },
            {
                type: 'footer',
                content: {
                    brandName: businessInfo.name,
                    tagline: `Solusi terbaik di ${businessInfo.location}`,
                    copyrightText: `© ${new Date().getFullYear()} ${businessInfo.name}. All rights reserved.`,
                    socialLinks: [
                        { platform: 'whatsapp', url: waUrl },
                        ...(businessInfo.instagram ? [{ platform: 'instagram', url: `https://instagram.com/${businessInfo.instagram.replace('@', '')}` }] : []),
                    ],
                },
            },
        ],
    };
}
