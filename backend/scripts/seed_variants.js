const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { promiseDb } = require('../db');

const variantsData = [
    // 144: Vincent Chase Classic Wayfarer Eyeglasses
    {
        productId: 144,
        defaultImage: '/images/products/prod-144-vincent-chase-wayfarer-black.jpg',
        variants: [
            { color_name: 'Matte Black', color_code: '#18181b', image: '/images/products/prod-144-vincent-chase-wayfarer-black.jpg', is_default: true, stock: 15 },
            { color_name: 'Midnight Blue', color_code: '#1e3a8a', image: '/images/products/prod-144-vincent-chase-wayfarer-blue.jpg', is_default: false, stock: 10 },
            { color_name: 'Tortoiseshell Brown', color_code: '#5c3818', image: '/images/products/prod-144-vincent-chase-wayfarer-tortoiseshell.jpg', is_default: false, stock: 10 }
        ]
    },
    // 145: John Jacobs Clubmaster Classic Eyeglasses
    {
        productId: 145,
        defaultImage: '/images/products/prod-145-john-jacobs-clubmaster-tortoise.jpg',
        variants: [
            { color_name: 'Tortoise Gold', color_code: '#78350f', image: '/images/products/prod-145-john-jacobs-clubmaster-tortoise.jpg', is_default: true, stock: 10 },
            { color_name: 'Black Gold', color_code: '#1f2937', image: '/images/products/prod-145-john-jacobs-clubmaster-black-gold.jpg', is_default: false, stock: 10 },
            { color_name: 'Gunmetal Silver', color_code: '#475569', image: '/images/products/prod-145-john-jacobs-clubmaster-gunmetal.jpg', is_default: false, stock: 8 }
        ]
    },
    // 146: Ray-Ban Round Metal Optics
    {
        productId: 146,
        defaultImage: '/images/products/prod-146-rayban-round-gunmetal.png',
        variants: [
            { color_name: 'Polished Gunmetal', color_code: '#374151', image: '/images/products/prod-146-rayban-round-gunmetal.png', is_default: true, stock: 8 },
            { color_name: 'Legend Gold', color_code: '#d97706', image: '/images/products/prod-146-rayban-round-gold.png', is_default: false, stock: 6 },
            { color_name: 'Matte Black', color_code: '#18181b', image: '/images/products/prod-146-rayban-round-black.png', is_default: false, stock: 6 }
        ]
    },
    // 147: Titan Silhouette Rimless Eyeglasses
    {
        productId: 147,
        defaultImage: '/images/products/prod-147-titan-rimless-silver.jpg',
        variants: [
            { color_name: 'Silver', color_code: '#94a3b8', image: '/images/products/prod-147-titan-rimless-silver.jpg', is_default: true, stock: 8 },
            { color_name: 'Matte Black', color_code: '#1e293b', image: '/images/products/prod-147-titan-rimless-black.jpg', is_default: false, stock: 5 },
            { color_name: 'Rose Gold', color_code: '#be185d', image: '/images/products/prod-147-titan-rimless-rosegold.jpg', is_default: false, stock: 5 }
        ]
    },
    // 148: Ray-Ban Wayfarer Classic Polarized
    {
        productId: 148,
        defaultImage: '/images/products/prod-148-rayban-wayfarer-black.jpg',
        variants: [
            { color_name: 'Glossy Black', color_code: '#000000', image: '/images/products/prod-148-rayban-wayfarer-black.jpg', is_default: true, stock: 10 },
            { color_name: 'Tortoise Havana', color_code: '#78350f', image: '/images/products/prod-148-rayban-wayfarer-tortoise.jpg', is_default: false, stock: 6 },
            { color_name: 'Matte Navy', color_code: '#1e3a5f', image: '/images/products/prod-148-rayban-wayfarer-navy.jpg', is_default: false, stock: 6 }
        ]
    },
    // 149: Fastrack Street Hexagonal Sunglasses
    {
        productId: 149,
        defaultImage: '/images/products/prod-149-fastrack-hexagonal-goldgreen.jpg',
        variants: [
            { color_name: 'Gold Green', color_code: '#d97706', image: '/images/products/prod-149-fastrack-hexagonal-goldgreen.jpg', is_default: true, stock: 18 },
            { color_name: 'Matte Black', color_code: '#111827', image: '/images/products/prod-149-fastrack-hexagonal-black.jpg', is_default: false, stock: 15 },
            { color_name: 'Silver Mirror', color_code: '#64748b', image: '/images/products/prod-149-fastrack-hexagonal-silver.jpg', is_default: false, stock: 12 }
        ]
    },
    // 150: Vincent Chase Polarized Clubmaster Sunglasses
    {
        productId: 150,
        defaultImage: '/images/products/prod-150-vincent-chase-clubmaster-tortoise.jpg',
        variants: [
            { color_name: 'Matte Tortoise', color_code: '#854d0e', image: '/images/products/prod-150-vincent-chase-clubmaster-tortoise.jpg', is_default: true, stock: 12 },
            { color_name: 'Jet Black Gold', color_code: '#18181b', image: '/images/products/prod-150-vincent-chase-clubmaster-black.jpg', is_default: false, stock: 10 },
            { color_name: 'Emerald Havana', color_code: '#065f46', image: '/images/products/prod-150-vincent-chase-clubmaster-emerald.jpg', is_default: false, stock: 8 }
        ]
    },
    // 151: John Jacobs Cat-Eye Gradient Sunglasses
    {
        productId: 151,
        defaultImage: '/images/products/prod-151-john-jacobs-cateye-burgundy.jpg',
        variants: [
            { color_name: 'Burgundy Brown', color_code: '#701a75', image: '/images/products/prod-151-john-jacobs-cateye-burgundy.jpg', is_default: true, stock: 10 },
            { color_name: 'Onyx Black', color_code: '#18181b', image: '/images/products/prod-151-john-jacobs-cateye-black.svg', is_default: false, stock: 8 },
            { color_name: 'Champagne Tortoise', color_code: '#b45309', image: '/images/products/prod-151-john-jacobs-cateye-champagne.svg', is_default: false, stock: 7 }
        ]
    },
    // 152: Vincent Chase Anti-Glare Screen Eyewear
    {
        productId: 152,
        defaultImage: '/images/products/prod-152-vc-screen-crystal.svg',
        variants: [
            { color_name: 'Transparent Crystal', color_code: '#94a3b8', image: '/images/products/prod-152-vc-screen-crystal.svg', is_default: true, stock: 25 },
            { color_name: 'Smoky Grey', color_code: '#475569', image: '/images/products/prod-152-vc-screen-grey.svg', is_default: false, stock: 25 }
        ]
    },
    // 153: John Jacobs Blue Cut Square Glasses
    {
        productId: 153,
        defaultImage: '/images/products/prod-153-jj-bluecut-navy.svg',
        variants: [
            { color_name: 'Midnight Blue', color_code: '#1e3a8a', image: '/images/products/prod-153-jj-bluecut-navy.svg', is_default: true, stock: 16 },
            { color_name: 'Matte Black', color_code: '#18181b', image: '/images/products/prod-153-jj-bluecut-black.svg', is_default: false, stock: 16 }
        ]
    },
    // 154: Fastrack Screen Shield Glasses
    {
        productId: 154,
        defaultImage: '/images/products/prod-154-fastrack-shield-grey.svg',
        variants: [
            { color_name: 'Matte Grey', color_code: '#475569', image: '/images/products/prod-154-fastrack-shield-grey.svg', is_default: true, stock: 22 },
            { color_name: 'Crystal Brown', color_code: '#78350f', image: '/images/products/prod-154-fastrack-shield-brown.svg', is_default: false, stock: 20 }
        ]
    },
    // 155: Titan WorkPro Ergonomic Computer Glasses
    {
        productId: 155,
        defaultImage: '/images/products/prod-155-titan-workpro-black.svg',
        variants: [
            { color_name: 'Matte Black', color_code: '#0f172a', image: '/images/products/prod-155-titan-workpro-black.svg', is_default: true, stock: 20 },
            { color_name: 'Brushed Gunmetal', color_code: '#334155', image: '/images/products/prod-155-titan-workpro-gunmetal.svg', is_default: false, stock: 18 }
        ]
    },
    // 156: Vincent Chase Digital Pro Computer Frames
    {
        productId: 156,
        defaultImage: '/images/products/prod-156-vc-digital-blue.svg',
        variants: [
            { color_name: 'Gunmetal Blue', color_code: '#1e3a5f', image: '/images/products/prod-156-vc-digital-blue.svg', is_default: true, stock: 22 },
            { color_name: 'Amber Tortoise', color_code: '#b45309', image: '/images/products/prod-156-vc-digital-amber.svg', is_default: false, stock: 22 }
        ]
    },
    // 157: Ray-Ban Tech Shield Computer Eyewear
    {
        productId: 157,
        defaultImage: '/images/products/prod-157-rayban-shield-silver.svg',
        variants: [
            { color_name: 'Brushed Silver', color_code: '#cbd5e1', image: '/images/products/prod-157-rayban-shield-silver.svg', is_default: true, stock: 10 },
            { color_name: 'Satin Black', color_code: '#1e293b', image: '/images/products/prod-157-rayban-shield-black.svg', is_default: false, stock: 9 }
        ]
    },
    // 158: Titan Junior Flexible Round Kids Eyeglasses
    {
        productId: 158,
        defaultImage: '/images/products/prod-158-titan-junior-sky-blue.svg',
        variants: [
            { color_name: 'Sky Blue & Lime', color_code: '#0284c7', image: '/images/products/prod-158-titan-junior-sky-blue.svg', is_default: true, stock: 12 },
            { color_name: 'Royal Blue', color_code: '#2563eb', image: '/images/products/prod-158-titan-junior-royal-blue.svg', is_default: false, stock: 10 },
            { color_name: 'Cherry Red', color_code: '#dc2626', image: '/images/products/prod-158-titan-junior-cherry-red.svg', is_default: false, stock: 8 }
        ]
    },
    // 159: Vincent Chase Kids Soft-Flex Eyeglasses
    {
        productId: 159,
        defaultImage: '/images/products/prod-159-vincent-chase-kids-pink.svg',
        variants: [
            { color_name: 'Bubblegum Pink', color_code: '#ec4899', image: '/images/products/prod-159-vincent-chase-kids-pink.svg', is_default: true, stock: 15 },
            { color_name: 'Pastel Teal', color_code: '#0d9488', image: '/images/products/prod-159-vincent-chase-kids-teal.svg', is_default: false, stock: 10 },
            { color_name: 'Purple Violet', color_code: '#7c3aed', image: '/images/products/prod-159-vincent-chase-kids-purple.svg', is_default: false, stock: 10 }
        ]
    },
    // 160: Fastrack Kids Sporty Sunglasses
    {
        productId: 160,
        defaultImage: '/images/products/prod-160-fastrack-kids-red.svg',
        variants: [
            { color_name: 'Electric Red', color_code: '#e11d48', image: '/images/products/prod-160-fastrack-kids-red.svg', is_default: true, stock: 10 },
            { color_name: 'Neon Blue', color_code: '#0284c7', image: '/images/products/prod-160-fastrack-kids-blue.svg', is_default: false, stock: 8 },
            { color_name: 'Solar Yellow', color_code: '#eab308', image: '/images/products/prod-160-fastrack-kids-yellow.svg', is_default: false, stock: 7 }
        ]
    },
    // 161: John Jacobs Junior Anti-Glare Computer Glasses
    {
        productId: 161,
        defaultImage: '/images/products/prod-161-jj-junior-teal.svg',
        variants: [
            { color_name: 'Navy Teal', color_code: '#0f766e', image: '/images/products/prod-161-jj-junior-teal.svg', is_default: true, stock: 15 },
            { color_name: 'Coral Pink', color_code: '#f43f5e', image: '/images/products/prod-161-jj-junior-coral.svg', is_default: false, stock: 13 }
        ]
    },
    // 162: Bausch + Lomb SofLens 59
    {
        productId: 162,
        defaultImage: '/images/products/prod-162-bausch-lomb-soflens-59.jpg',
        variants: [
            { color_name: 'Clear Blue Tint', color_code: '#38bdf8', image: '/images/products/prod-162-bausch-lomb-soflens-59.jpg', is_default: true, stock: 60 }
        ]
    },
    // 167: Essilor Crizal Easy Pro
    {
        productId: 167,
        defaultImage: '/images/products/prod-167-essilor-crizal-easy-pro.jpg',
        variants: [
            { color_name: 'Clear Anti-Reflective', color_code: '#94a3b8', image: '/images/products/prod-167-essilor-crizal-easy-pro.jpg', is_default: true, stock: 45 }
        ]
    }
];

async function seedVariants() {
    try {
        console.log('--- SEEDING PRODUCT VARIANTS AND IMAGES ---');
        
        // Clear existing variants to ensure fresh clean state
        await promiseDb.query("DELETE FROM product_variants");
        console.log('✓ Cleared existing product_variants');

        for (const entry of variantsData) {
            // 1. Update product default image & color
            const defaultVar = entry.variants.find(v => v.is_default) || entry.variants[0];
            await promiseDb.query(
                "UPDATE products SET image = ?, color = ? WHERE id = ?",
                [entry.defaultImage || defaultVar.image, defaultVar.color_name, entry.productId]
            );

            // 2. Insert all variants
            for (const v of entry.variants) {
                await promiseDb.query(
                    `INSERT INTO product_variants 
                    (product_id, color_name, color_code, image, stock, is_default) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [entry.productId, v.color_name, v.color_code, v.image, v.stock || 20, v.is_default ? 1 : 0]
                );
            }
            console.log(`✓ Seeded ${entry.variants.length} variants for Product ID ${entry.productId}`);
        }

        const [varCount] = await promiseDb.query("SELECT COUNT(*) as cnt FROM product_variants");
        console.log(`--- SUCCESS: Total ${varCount[0].cnt} variants created in product_variants ---`);
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seedVariants();
