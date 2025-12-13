const chalk = require('chalk');
const mongoose = require('mongoose');

const setupDB = require('./db');
const Product = require('../models/product');
const Category = require('../models/category');
const Brand = require('../models/brand');

// Helper function to remove "Faith Industries" from product name
const cleanProductName = (name) => {
    if (!name) return '';
    return name.replace(/^Faith Industries\s*["']?/i, '').replace(/^["']/, '').trim();
};

// Helper function to determine category from product name
const getCategoryFromName = (name) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('jacket') || nameLower.includes('hoodie') || nameLower.includes('tracktop')) {
        return 'jacket';
    } else if (nameLower.includes('tshirt') || nameLower.includes('t-shirt') || nameLower.includes('longsleeve')) {
        return 'tshirt';
    } else if (nameLower.includes('shirt')) {
        return 'shirt';
    } else if (nameLower.includes('pants') || nameLower.includes('pant')) {
        return 'pants';
    } else if (nameLower.includes('totebag') || nameLower.includes('card holder') || nameLower.includes('socks') || nameLower.includes('accessories')) {
        return 'accessories';
    }
    return 'tshirt'; // default
};

// Sample fashion products data from Faith Industries
// You can expand this list with more products from faithindustries.co
const faithIndustriesProducts = [
    {
        name: 'Faith Industries "File 0000001" Work Jacket',
        description: 'Premium work jacket with modern design',
        price: 700000,
        imageUrl: 'https://faithindustries.co/cdn/shop/files/1_10bd9114-7dd1-4ee0-8c22-cdfd1fb30653.jpg?v=1765539393&width=1500',
        category: 'jacket',
        isNewArrival: true,
        sku: 'FI-FILE-001'
    },
    {
        name: 'Faith Industries "Pressure of Death" White Tshirt',
        description: 'Classic white t-shirt with unique design',
        price: 225000,
        imageUrl: 'https://faithindustries.co/cdn/shop/files/ffdepan_02932347-a98d-4c78-978a-3a84a1ca0301.jpg?v=1765003291&width=1500',
        category: 'tshirt',
        isNewArrival: true,
        sku: 'FI-POD-001'
    },
    {
        name: 'Faith Industries "Roasting Skeletons" Black Longsleeve',
        description: 'Black longsleeve with skeleton design',
        price: 235000,
        imageUrl: 'https://faithindustries.co/cdn/shop/files/berserkhitamdepan_3ae8f66c-5376-497c-8503-1524709937fb.jpg?v=1765003297&width=1500',
        category: 'tshirt',
        isNewArrival: true,
        sku: 'FI-RS-001'
    },
    {
        name: 'Faith Industries "Berserker Rage" White Tshirt',
        description: 'White t-shirt with berserker design',
        price: 215000,
        imageUrl: 'https://faithindustries.co/cdn/shop/files/bwfrontOP_04c2db4d-d0d5-4fa8-9e59-59725110714f.jpg?v=1764761022&width=1500',
        category: 'tshirt',
        isNewArrival: true,
        sku: 'FI-BR-001'
    },
    {
        name: 'Faith Industries "Joker" Black Tshirt',
        description: 'Black t-shirt with joker design',
        price: 195000,
        imageUrl: 'https://faithindustries.co/cdn/shop/files/joker_black.jpg?v=1765003297&width=1500',
        category: 'tshirt',
        isNewArrival: false,
        sku: 'FI-JOKER-001'
    },
    {
        name: 'Faith Industries "Asakusa\'s King of Destruction" Denim Shirt',
        description: 'Premium denim shirt with unique design',
        price: 375000,
        imageUrl: 'https://faithindustries.co/cdn/shop/files/asakusa_denim.jpg?v=1765003297&width=1500',
        category: 'shirt',
        isNewArrival: false,
        sku: 'FI-AKOD-001'
    },
    {
        name: 'Faith Industries "Dark Determination" Pullover Hoodie Zipp Navy',
        description: 'Navy pullover hoodie with zipper',
        price: 475000,
        imageUrl: 'https://faithindustries.co/cdn/shop/files/darkdetermination_navy.jpg?v=1765003297&width=1500',
        category: 'jacket',
        isNewArrival: false,
        sku: 'FI-DD-001'
    },
    {
        name: 'Faith Industries "Excalibur" Black Tshirt',
        description: 'Black t-shirt with excalibur design',
        price: 195000,
        imageUrl: 'https://faithindustries.co/cdn/shop/files/excalibur_black.jpg?v=1765003297&width=1500',
        category: 'tshirt',
        isNewArrival: false,
        sku: 'FI-EXCAL-001'
    },
    {
        name: 'Faith Industries "Cyberlucid" Tracktop',
        description: 'Modern tracktop with cyber design',
        price: 499000,
        imageUrl: 'https://faithindustries.co/cdn/shop/files/cyberlucid_tracktop.jpg?v=1765003297&width=1500',
        category: 'jacket',
        isNewArrival: false,
        sku: 'FI-CYBER-001'
    },
    {
        name: 'Faith Industries MH Wilds Armor Wash Black Totebag',
        description: 'Black totebag with armor wash design',
        price: 399000,
        imageUrl: 'https://faithindustries.co/cdn/shop/files/mh_wilds_totebag.jpg?v=1765003297&width=1500',
        category: 'accessories',
        isNewArrival: false,
        sku: 'FI-MH-001'
    },
    {
        name: 'Faith Industries "Blade of Miquella" Card Holder Maroon',
        description: 'Maroon card holder with unique design',
        price: 66000,
        imageUrl: 'https://faithindustries.co/cdn/shop/files/blade_miquella_cardholder.jpg?v=1765003297&width=1500',
        category: 'accessories',
        isNewArrival: false,
        sku: 'FI-BOM-001'
    },
    {
        name: 'Faith Industries "Ghibli" Socks',
        description: 'Comfortable socks with Ghibli design',
        price: 220000,
        imageUrl: 'https://faithindustries.co/cdn/shop/files/ghibli_socks.jpg?v=1765003297&width=1500',
        category: 'accessories',
        isNewArrival: false,
        sku: 'FI-GHIBLI-001'
    }
];

const updateProductsWithFaithIndustries = async () => {
    try {
        console.log(`${chalk.blue('✓')} ${chalk.blue('Starting to update products with Faith Industries data...')}`);

        // Get or create categories (lowercase for consistency)
        const categoryMap = {};
        const categoryNames = ['jacket', 'tshirt', 'shirt', 'accessories', 'pants', 'new arrival'];

        for (const catName of categoryNames) {
            let category = await Category.findOne({ name: catName, isActive: true });
            if (!category) {
                category = new Category({
                    name: catName,
                    description: `${catName} category`,
                    isActive: true
                });
                await category.save();
                console.log(`${chalk.green('✓')} Created category: ${catName}`);
            }
            categoryMap[catName] = category;
        }

        // Get or create a default brand (Faith Industries)
        let brand = await Brand.findOne({ name: 'Faith Industries', isActive: true });
        if (!brand) {
            brand = new Brand({
                name: 'Faith Industries',
                description: 'Faith Industries brand',
                isActive: true
            });
            await brand.save();
            console.log(`${chalk.green('✓')} Created brand: Faith Industries`);
        }

        let updatedCount = 0;
        let createdCount = 0;

        // Update or create products
        for (const productData of faithIndustriesProducts) {
            // Determine category from product name if not specified
            const categoryName = productData.category || getCategoryFromName(productData.name);
            const category = categoryMap[categoryName];

            if (!category) {
                console.log(`${chalk.red('x')} Category not found: ${categoryName}, skipping product`);
                continue;
            }

            // Clean product name (remove "Faith Industries")
            const cleanName = cleanProductName(productData.name);

            // Check if product exists by SKU
            let product = await Product.findOne({ sku: productData.sku });
            const isNewProduct = !product;

            if (product) {
                // Update existing product
                product.name = cleanName; // Use cleaned name
                product.description = productData.description;
                product.price = productData.price;
                product.imageUrl = productData.imageUrl;
                product.brand = brand._id;
                product.category = category._id;
                product.isActive = true;
                product.quantity = product.quantity || 50;

                await product.save();
                updatedCount++;
                console.log(`${chalk.yellow('!')} Updated product: ${cleanName}`);
            } else {
                // Create new product
                product = new Product({
                    sku: productData.sku,
                    name: cleanName, // Use cleaned name
                    description: productData.description,
                    price: productData.price,
                    imageUrl: productData.imageUrl,
                    quantity: 50,
                    taxable: true,
                    isActive: true,
                    brand: brand._id,
                    category: category._id
                });

                await product.save();
                createdCount++;
                console.log(`${chalk.green('✓')} Created product: ${cleanName}`);
            }

            // Always ensure product is in category array (for both new and existing)
            const categoryUpdate = await Category.updateOne(
                { _id: category._id },
                { $addToSet: { products: product._id } }
            );

            if (categoryUpdate.modifiedCount > 0 || categoryUpdate.matchedCount > 0) {
                console.log(`  → Added to category: ${category.name}`);
            }

            // Add to New Arrival category if applicable
            if (productData.isNewArrival && categoryMap['new arrival']) {
                const newArrivalUpdate = await Category.updateOne(
                    { _id: categoryMap['new arrival']._id },
                    { $addToSet: { products: product._id } }
                );

                if (newArrivalUpdate.modifiedCount > 0 || newArrivalUpdate.matchedCount > 0) {
                    console.log(`  → Added to category: new arrival`);
                }
            }
        }

        console.log(`${chalk.green('✓')} ${chalk.green(`Update complete! Created: ${createdCount}, Updated: ${updatedCount}`)}`);
    } catch (error) {
        console.log(`${chalk.red('x')} ${chalk.red('Error while updating products')}`);
        console.log(error);
        return null;
    } finally {
        await mongoose.connection.close();
        console.log(`${chalk.blue('✓')} ${chalk.blue('Database connection closed!')}`);
    }
};

(async () => {
    try {
        await setupDB();
        await updateProductsWithFaithIndustries();
    } catch (error) {
        console.error(`Error initializing database: ${error.message}`);
    }
})();

