/**
 * Safe, Idempotent Seed Script for EyeKart Products Catalog
 * 
 * - Populates both Frames and Lenses products across all subcategories
 * - Dynamically looks up existing Category IDs and Brand IDs from MySQL
 * - Prevents duplicates: checks product name before insert
 * - Valid INR prices, descriptions, and stock quantities
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { promiseDb } = require('../db');

async function seedProducts() {
    console.log('--- STARTING EYE-KART CATALOG SEEDING ---');

    // 1. Ensure Categories exist and fetch IDs
    console.log('[Step 1] Ensuring categories exist...');
    await promiseDb.query(`
        INSERT IGNORE INTO categories (name, description) VALUES
        ('Eyeglasses', 'Prescription and regular eyeglasses'),
        ('Sunglasses', 'Stylish sunglasses for everyday use'),
        ('Computer Glasses', 'Blue light protection glasses'),
        ('Contact Lenses', 'Comfortable daily, bi-weekly, and monthly contact lenses'),
        ('Optical Lenses', 'Single vision, bifocal, and progressive optical prescription lenses')
    `);

    const [categories] = await promiseDb.query('SELECT id, name FROM categories');
    const catMap = {};
    categories.forEach((c) => {
        catMap[c.name.toLowerCase()] = c.id;
    });
    console.log('Active Categories:', catMap);

    // 2. Ensure Brands exist and fetch IDs
    console.log('[Step 2] Ensuring brands exist...');
    await promiseDb.query(`
        INSERT IGNORE INTO brands (name) VALUES
        ('Ray-Ban'),
        ('Fastrack'),
        ('Titan'),
        ('Vincent Chase'),
        ('John Jacobs'),
        ('Bausch + Lomb'),
        ('Acuvue'),
        ('Essilor'),
        ('Carl Zeiss'),
        ('Alcon'),
        ('Hoya')
    `);

    const [brands] = await promiseDb.query('SELECT id, name FROM brands');
    const brandMap = {};
    brands.forEach((b) => {
        brandMap[b.name.toLowerCase()] = b.id;
    });
    console.log('Active Brands:', brandMap);

    // 3. Products Catalog Definition
    const productsToSeed = [
        // ==========================================
        // FRAMES: EYEGLASSES (Category: Eyeglasses)
        // ==========================================
        {
            name: 'Vincent Chase Wayfarer Titanium Eyeglasses',
            description: 'Ultra-lightweight titanium eyeglasses with reinforced temples and classic wayfarer silhouette for daily corporate and casual wear.',
            categoryName: 'eyeglasses',
            brandName: 'vincent chase',
            price: 1899.00,
            discount: 15.00,
            stock: 35,
            gender: 'Unisex',
            frame_type: 'Full Rim',
            frame_material: 'Titanium',
            lens_type: 'Clear',
            color: 'Matte Black',
            image: null
        },
        {
            name: 'John Jacobs Clubmaster Classic Eyeglasses',
            description: 'Handcrafted premium acetate browline frames with gold metal accents and precision keyhole bridge.',
            categoryName: 'eyeglasses',
            brandName: 'john jacobs',
            price: 2999.00,
            discount: 10.00,
            stock: 28,
            gender: 'Unisex',
            frame_type: 'Half Rim',
            frame_material: 'Acetate',
            lens_type: 'Clear',
            color: 'Tortoise Gold',
            image: null
        },
        {
            name: 'Ray-Ban Round Metal Optics',
            description: 'Iconic retro round optical spectacles crafted with durable tubular metal wire and adjustable silicone nose pads.',
            categoryName: 'eyeglasses',
            brandName: 'ray-ban',
            price: 3499.00,
            discount: 0.00,
            stock: 20,
            gender: 'Unisex',
            frame_type: 'Full Rim',
            frame_material: 'Metal',
            lens_type: 'Clear',
            color: 'Polished Gunmetal',
            image: null
        },
        {
            name: 'Titan Silhouette Rimless Eyeglasses',
            description: 'Minimalist rimless spectacles with flexible titanium alloy hinges for maximum comfort and an unobstructed field of view.',
            categoryName: 'eyeglasses',
            brandName: 'titan',
            price: 2199.00,
            discount: 20.00,
            stock: 18,
            gender: 'Unisex',
            frame_type: 'Rimless',
            frame_material: 'Titanium',
            lens_type: 'Clear',
            color: 'Silver',
            image: null
        },

        // ==========================================
        // FRAMES: SUNGLASSES (Category: Sunglasses)
        // ==========================================
        {
            name: 'Ray-Ban Wayfarer Classic Polarized',
            description: 'Timeless wayfarer sunglasses with polarized crystal green lenses offering 100% UV400 solar protection and glare reduction.',
            categoryName: 'sunglasses',
            brandName: 'ray-ban',
            price: 4299.00,
            discount: 10.00,
            stock: 22,
            gender: 'Unisex',
            frame_type: 'Full Rim',
            frame_material: 'Acetate',
            lens_type: 'Polarized',
            color: 'Glossy Black',
            image: null
        },
        {
            name: 'Fastrack Street Hexagonal Sunglasses',
            description: 'Edgy geometric hexagonal frame with gradient tinted lenses and lightweight metal build, ideal for outdoor leisure.',
            categoryName: 'sunglasses',
            brandName: 'fastrack',
            price: 1499.00,
            discount: 25.00,
            stock: 45,
            gender: 'Unisex',
            frame_type: 'Full Rim',
            frame_material: 'Metal',
            lens_type: 'UV Protection',
            color: 'Gold Green',
            image: null
        },
        {
            name: 'Vincent Chase Polarized Clubmaster Sunglasses',
            description: 'Distinguished browline sunglasses with polarized anti-glare lenses and sturdy acetate temples.',
            categoryName: 'sunglasses',
            brandName: 'vincent chase',
            price: 1799.00,
            discount: 30.00,
            stock: 30,
            gender: 'Men',
            frame_type: 'Half Rim',
            frame_material: 'Acetate',
            lens_type: 'Polarized',
            color: 'Matte Tortoise',
            image: null
        },
        {
            name: 'John Jacobs Cat-Eye Gradient Sunglasses',
            description: 'Fashion-forward oversized cat-eye sunglasses with gradient smoke lenses and elegant gold temples for women.',
            categoryName: 'sunglasses',
            brandName: 'john jacobs',
            price: 2799.00,
            discount: 15.00,
            stock: 25,
            gender: 'Women',
            frame_type: 'Full Rim',
            frame_material: 'Acetate',
            lens_type: 'UV Protection',
            color: 'Burgundy Brown',
            image: null
        },

        // ==============================================================
        // FRAMES: BLUE LIGHT GLASSES (Category: Computer Glasses / Blue Cut)
        // ==============================================================
        {
            name: 'Vincent Chase Anti-Glare Screen Eyewear',
            description: 'Ergonomic TR90 screen defense glasses designed to block harmful 400-450nm blue light emissions from laptops and monitors.',
            categoryName: 'computer glasses',
            brandName: 'vincent chase',
            price: 1499.00,
            discount: 20.00,
            stock: 50,
            gender: 'Unisex',
            frame_type: 'Full Rim',
            frame_material: 'TR90 Plastic',
            lens_type: 'Blue Light Filter',
            color: 'Transparent Crystal',
            image: null
        },
        {
            name: 'John Jacobs Blue Cut Square Glasses',
            description: 'Contemporary square silhouette frame with integrated blue-cut multi-coated lenses, reducing digital eye strain and dry eyes.',
            categoryName: 'computer glasses',
            brandName: 'john jacobs',
            price: 2499.00,
            discount: 10.00,
            stock: 32,
            gender: 'Unisex',
            frame_type: 'Full Rim',
            frame_material: 'Acetate',
            lens_type: 'Blue Light Filter',
            color: 'Midnight Blue',
            image: null
        },
        {
            name: 'Fastrack Screen Shield Glasses',
            description: 'Sporty lightweight digital glasses engineered for coders and gamers with anti-reflective coating and yellow-tint filter balance.',
            categoryName: 'computer glasses',
            brandName: 'fastrack',
            price: 1299.00,
            discount: 15.00,
            stock: 42,
            gender: 'Unisex',
            frame_type: 'Full Rim',
            frame_material: 'Plastic',
            lens_type: 'Blue Light Filter',
            color: 'Matte Grey',
            image: null
        },

        // ==========================================================
        // FRAMES: COMPUTER GLASSES (Category: Computer Glasses)
        // ==========================================================
        {
            name: 'Titan WorkPro Ergonomic Computer Glasses',
            description: 'Ultem aerospace-grade flexible material with zero pressure on nose and ears, tailored for long office sessions.',
            categoryName: 'computer glasses',
            brandName: 'titan',
            price: 1999.00,
            discount: 10.00,
            stock: 38,
            gender: 'Unisex',
            frame_type: 'Full Rim',
            frame_material: 'Ultem',
            lens_type: 'Blue Light Filter',
            color: 'Matte Black',
            image: null
        },
        {
            name: 'Vincent Chase Digital Pro Computer Frames',
            description: 'Half-rim professional metallic computer spectacles equipped with high-transmittance anti-fatigue optical lenses.',
            categoryName: 'computer glasses',
            brandName: 'vincent chase',
            price: 1599.00,
            discount: 25.00,
            stock: 44,
            gender: 'Unisex',
            frame_type: 'Half Rim',
            frame_material: 'Metal',
            lens_type: 'Blue Light Filter',
            color: 'Gunmetal Blue',
            image: null
        },
        {
            name: 'Ray-Ban Tech Shield Computer Eyewear',
            description: 'Titanium performance glasses with patented blue violet filter lenses, ensuring crisp clarity and reduced eye fatigue.',
            categoryName: 'computer glasses',
            brandName: 'ray-ban',
            price: 3999.00,
            discount: 5.00,
            stock: 19,
            gender: 'Unisex',
            frame_type: 'Full Rim',
            frame_material: 'Titanium',
            lens_type: 'Blue Light Filter',
            color: 'Brushed Silver',
            image: null
        },

        // ==========================================================
        // FRAMES: KIDS EYEWEAR (Durable, Flexible, Child-Safe)
        // ==========================================================
        {
            name: 'Titan Junior Flexible Round Kids Eyeglasses',
            description: 'Unbreakable bendable TR90 frame with soft food-grade silicone ear tips and temple strap, crafted specifically for children.',
            categoryName: 'eyeglasses',
            brandName: 'titan',
            price: 1299.00,
            discount: 20.00,
            stock: 30,
            gender: 'Kids',
            frame_type: 'Full Rim',
            frame_material: 'TR90 Plastic',
            lens_type: 'Clear',
            color: 'Sky Blue & Lime',
            image: null
        },
        {
            name: 'Vincent Chase Kids Soft-Flex Eyeglasses',
            description: 'Hypoallergenic hinge-free flexible spectacles for active kids with shatter-resistant polycarbonate optical clear lenses.',
            categoryName: 'eyeglasses',
            brandName: 'vincent chase',
            price: 1099.00,
            discount: 15.00,
            stock: 35,
            gender: 'Kids',
            frame_type: 'Full Rim',
            frame_material: 'TR90 Plastic',
            lens_type: 'Clear',
            color: 'Bubblegum Pink',
            image: null
        },
        {
            name: 'Fastrack Kids Sporty Sunglasses',
            description: 'Full UV400 protection polarized sunglasses with wraparound rubberized frame designed for children outdoor play.',
            categoryName: 'sunglasses',
            brandName: 'fastrack',
            price: 899.00,
            discount: 10.00,
            stock: 25,
            gender: 'Kids',
            frame_type: 'Full Rim',
            frame_material: 'TR90 Plastic',
            lens_type: 'UV Protection',
            color: 'Electric Red',
            image: null
        },
        {
            name: 'John Jacobs Junior Anti-Glare Computer Glasses',
            description: 'Kid-sized blue light filtering glasses designed to safeguard young eyes during online study and tablet screen time.',
            categoryName: 'computer glasses',
            brandName: 'john jacobs',
            price: 1499.00,
            discount: 10.00,
            stock: 28,
            gender: 'Kids',
            frame_type: 'Full Rim',
            frame_material: 'TR90 Plastic',
            lens_type: 'Blue Light Filter',
            color: 'Navy Teal',
            image: null
        },

        // ==========================================================
        // LENSES: CONTACT LENSES (Category: Contact Lenses)
        // ==========================================================
        {
            name: 'Bausch + Lomb SofLens 59 Monthly Contact Lenses',
            description: 'High water-content (59%) monthly disposable contact lenses with Hilafilcon B material, delivering crisp vision and deposit resistance. Pack of 6 lenses.',
            categoryName: 'contact lenses',
            brandName: 'bausch + lomb',
            price: 999.00,
            discount: 10.00,
            stock: 60,
            gender: 'Unisex',
            frame_type: null,
            frame_material: 'Hydrogel',
            lens_type: 'Spherical Hydrogel',
            color: 'Clear Blue Tint',
            image: null
        },
        {
            name: 'Acuvue Oasys Bi-Weekly Hydraclear Contact Lenses',
            description: 'Premium Senofilcon A silicone hydrogel contact lenses featuring Hydraclear Plus technology for all-day moisture and Class 1 UV blocking. Pack of 6 lenses.',
            categoryName: 'contact lenses',
            brandName: 'acuvue',
            price: 1499.00,
            discount: 15.00,
            stock: 50,
            gender: 'Unisex',
            frame_type: null,
            frame_material: 'Silicone Hydrogel',
            lens_type: 'Silicone Hydrogel',
            color: 'Clear Blue Tint',
            image: null
        },
        {
            name: 'Alcon Dailies Total 1 Water Gradient Disposable Lenses',
            description: 'First water gradient daily disposable contact lenses with over 80% water content at the outer surface for exceptional comfort. Pack of 30 daily lenses.',
            categoryName: 'contact lenses',
            brandName: 'alcon',
            price: 2199.00,
            discount: 10.00,
            stock: 40,
            gender: 'Unisex',
            frame_type: null,
            frame_material: 'Silicone Hydrogel',
            lens_type: 'Water Gradient Daily',
            color: 'Clear',
            image: null
        },
        {
            name: 'Bausch + Lomb PureVision 2 HD Disposable Contact Lenses',
            description: 'High definition optics designed to reduce spherical aberration, halation, and glare in low light conditions. Pack of 6 monthly lenses.',
            categoryName: 'contact lenses',
            brandName: 'bausch + lomb',
            price: 1799.00,
            discount: 12.00,
            stock: 35,
            gender: 'Unisex',
            frame_type: null,
            frame_material: 'Silicone Hydrogel',
            lens_type: 'High Definition Silicone',
            color: 'Clear Blue Tint',
            image: null
        },
        {
            name: 'Biofinity Toric Astigmatism Contact Lenses',
            description: 'Aquaform technology toric contact lenses providing stable orientation and clear vision for astigmatic wearers. Pack of 3 monthly lenses.',
            categoryName: 'contact lenses',
            brandName: 'alcon',
            price: 2499.00,
            discount: 8.00,
            stock: 25,
            gender: 'Unisex',
            frame_type: null,
            frame_material: 'Silicone Hydrogel',
            lens_type: 'Toric Silicone Hydrogel',
            color: 'Clear Blue Tint',
            image: null
        },

        // ==========================================================
        // LENSES: OPTICAL PRESCRIPTION LENSES (Category: Optical Lenses)
        // ==========================================================
        {
            name: 'Essilor Crizal Easy Pro Single-Vision Optical Lenses',
            description: 'Advanced anti-reflective single-vision corrective lenses with hydrophobic and oleophobic dust/smudge repellent shield. Sold as pair.',
            categoryName: 'optical lenses',
            brandName: 'essilor',
            price: 1899.00,
            discount: 15.00,
            stock: 45,
            gender: 'Unisex',
            frame_type: null,
            frame_material: 'CR-39 Resin',
            lens_type: 'Single Vision',
            color: 'Clear Anti-Reflective',
            image: null
        },
        {
            name: 'Carl Zeiss DriveSafe Progressive Optical Lenses',
            description: 'State-of-the-art progressive lenses with Luminance Design Technology, specially formulated for driving clarity and seamless distance-to-dashboard transition. Sold as pair.',
            categoryName: 'optical lenses',
            brandName: 'carl zeiss',
            price: 6499.00,
            discount: 10.00,
            stock: 20,
            gender: 'Unisex',
            frame_type: null,
            frame_material: 'High-Index Polymer',
            lens_type: 'Progressive',
            color: 'Clear Anti-Glare',
            image: null
        },
        {
            name: 'Essilor Varilux Comfort Max Digital Progressive Lenses',
            description: 'Flex Optim technology delivers unmatched ergonomic viewing angles and natural posture across distance, intermediate, and near reading zones. Sold as pair.',
            categoryName: 'optical lenses',
            brandName: 'essilor',
            price: 5499.00,
            discount: 12.00,
            stock: 24,
            gender: 'Unisex',
            frame_type: null,
            frame_material: 'CR-39 Resin',
            lens_type: 'Progressive',
            color: 'Clear Anti-Reflective',
            image: null
        },
        {
            name: 'Crizal Prevencia Anti-Reflective Blue-Light Filter Lenses',
            description: 'Light Scan selective filter technology blocking harmful blue-violet light and UV while permitting essential blue-turquoise light for natural circadian rhythm. Sold as pair.',
            categoryName: 'optical lenses',
            brandName: 'essilor',
            price: 2799.00,
            discount: 20.00,
            stock: 40,
            gender: 'Unisex',
            frame_type: null,
            frame_material: 'Polycarbonate',
            lens_type: 'Blue Light Filter',
            color: 'Violet-Blue Shield',
            image: null
        },
        {
            name: 'Kodak Clean&Clear Bifocal D-Segment Prescription Lenses',
            description: 'Traditional D-segment bifocal optical lenses with distinct distance and reading zones, treated with durable anti-scratch quartz coating. Sold as pair.',
            categoryName: 'optical lenses',
            brandName: 'carl zeiss',
            price: 2299.00,
            discount: 10.00,
            stock: 30,
            gender: 'Unisex',
            frame_type: null,
            frame_material: 'CR-39 Resin',
            lens_type: 'Bifocal',
            color: 'Clear Hard Coat',
            image: null
        },
        {
            name: 'Hoya Hi-Vision LongLife Scratch-Resistant Optical Lenses',
            description: 'Hardest multi-coating in the ophthalmic industry with 7-layer diamond anti-scratch finish and total UV400 rear-surface protection. Sold as pair.',
            categoryName: 'optical lenses',
            brandName: 'hoya',
            price: 3199.00,
            discount: 15.00,
            stock: 35,
            gender: 'Unisex',
            frame_type: null,
            frame_material: 'Polycarbonate',
            lens_type: 'Single Vision',
            color: 'Clear High-Clarity',
            image: null
        }
    ];

    let insertedCount = 0;
    let skippedCount = 0;

    for (const item of productsToSeed) {
        const [existing] = await promiseDb.query(
            'SELECT id FROM products WHERE LOWER(name) = LOWER(?)',
            [item.name]
        );

        if (existing.length > 0) {
            console.log(`[SKIP] "${item.name}" already exists with ID: ${existing[0].id}`);
            skippedCount++;
            continue;
        }

        const categoryId = catMap[item.categoryName.toLowerCase()] || null;
        const brandId = brandMap[item.brandName.toLowerCase()] || null;

        await promiseDb.query(
            `INSERT INTO products 
            (name, description, category_id, brand_id, price, discount, stock, gender, frame_type, frame_material, lens_type, color, image) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                item.name,
                item.description,
                categoryId,
                brandId,
                item.price,
                item.discount,
                item.stock,
                item.gender,
                item.frame_type,
                item.frame_material,
                item.lens_type,
                item.color,
                item.image
            ]
        );

        console.log(`[INSERTED] "${item.name}" (CatID: ${categoryId}, BrandID: ${brandId}, Price: ₹${item.price})`);
        insertedCount++;
    }

    const [[totalStats]] = await promiseDb.query('SELECT COUNT(*) AS total FROM products');
    console.log('----------------------------------------------------');
    console.log(`SUMMARY: ${insertedCount} inserted, ${skippedCount} skipped.`);
    console.log(`Total products currently in catalog: ${totalStats.total}`);
    console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
    process.exit(0);
}

seedProducts().catch((err) => {
    console.error('[ERROR] Seeding failed:', err);
    process.exit(1);
});
