const mongoose = require('mongoose');
const setupDB = require('./db');
const Category = require('../models/category');
const Product = require('../models/product');
const Brand = require('../models/brand');

const debugProducts = async () => {
    try {
        await setupDB();

        console.log('\n=== Categories ===');
        const categories = await Category.find({ isActive: true });
        for (const cat of categories) {
            console.log(`- ${cat.name} (slug: ${cat.slug}): ${cat.products.length} products`);
        }

        console.log('\n=== Products ===');
        const products = await Product.find({ isActive: true }).limit(10).populate('category').populate('brand');
        console.log(`Total active products: ${await Product.countDocuments({ isActive: true })}`);
        for (const prod of products) {
            console.log(`- ${prod.name}`);
            console.log(`  Category: ${prod.category ? prod.category.name : 'NONE'}`);
            console.log(`  Brand: ${prod.brand ? prod.brand.name : 'NONE'}`);
            console.log(`  isActive: ${prod.isActive}`);
        }

        console.log('\n=== Brand ===');
        const brand = await Brand.findOne({ name: 'Faith Industries' });
        if (brand) {
            console.log(`Faith Industries brand exists: isActive=${brand.isActive}`);
        } else {
            console.log('Faith Industries brand NOT FOUND');
        }

        // Check if products are in category arrays
        console.log('\n=== Products in Categories ===');
        for (const cat of categories) {
            const productsInCat = await Product.find({
                _id: { $in: cat.products },
                isActive: true
            });
            console.log(`${cat.name}: ${productsInCat.length} active products in array`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
};

debugProducts();

