const { promiseDb } = require('./db');

async function inspect() {
    try {
        const [tables] = await promiseDb.query("SHOW TABLES");
        console.log("TABLES:", tables);

        const [products] = await promiseDb.query("SELECT id, name, category_id, brand_id, color, image, stock, price FROM products");
        console.log("TOTAL PRODUCTS:", products.length);
        console.log("PRODUCTS:", JSON.stringify(products, null, 2));

        const [categories] = await promiseDb.query("SELECT * FROM categories");
        console.log("CATEGORIES:", categories);

        const [brands] = await promiseDb.query("SELECT * FROM brands");
        console.log("BRANDS:", brands);

        const tableNames = tables.map(t => Object.values(t)[0]);
        if (tableNames.includes('product_variants')) {
            const [variants] = await promiseDb.query("SELECT * FROM product_variants");
            console.log("VARIANTS COUNT:", variants.length);
            console.log("VARIANTS:", JSON.stringify(variants, null, 2));
        } else {
            console.log("product_variants table does NOT exist yet.");
        }

        const [orderItemCols] = await promiseDb.query("SHOW COLUMNS FROM order_items");
        console.log("ORDER_ITEMS COLUMNS:", orderItemCols.map(c => c.Field));

        process.exit(0);
    } catch (err) {
        console.error("Inspection error:", err);
        process.exit(1);
    }
}

inspect();
