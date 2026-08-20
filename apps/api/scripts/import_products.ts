import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const db = new PrismaClient();

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function ensureCategory(name: string, parentId: string | null = null) {
  if (!name || name.trim() === '') return null;
  const slug = slugify(name);
  
  let category = await db.category.findFirst({
    where: { slug, parentId }
  });

  if (!category) {
    category = await db.category.create({
      data: {
        name: name.trim(),
        slug,
        parentId
      }
    });
  }
  return category;
}

async function importCSV(filePath: string) {
  console.log(`Starting import from ${filePath}...`);
  
  const results: any[] = [];
  
  await new Promise((resolve, reject) => {
    console.log("Creating read stream...");
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => { console.error("File Read Error:", err); reject(err); });
    stream
      .pipe(csv())
      .on('data', (data) => {
        console.log("Read row:", data['Name']);
        results.push(data);
      })
      .on('end', () => {
        console.log("Finished reading CSV. Processing", results.length, "rows.");
        resolve(true);
      })
      .on('error', (err) => {
        console.error("CSV Parse Error:", err);
        reject(err);
      });
  });

  let productCount = 0;
  let variantCount = 0;

  for (const row of results) {
    try {
      const name = row['Name']?.trim();
      if (!name) continue; // Skip empty rows

      // 1. Ensure Categories
      const cat1Name = row["Category (e.g. Men's Fashion)"];
      const cat2Name = row["Subcategory (e.g. Tops)"];
      const cat3Name = row["Sub-Subcategory (e.g. T-shirts)"];

      let currentParentId = null;
      let finalCategoryId = null;

      if (cat1Name) {
        const cat1 = await ensureCategory(cat1Name, null);
        currentParentId = cat1!.id;
        finalCategoryId = cat1!.id;
      }
      if (cat2Name && currentParentId) {
        const cat2 = await ensureCategory(cat2Name, currentParentId);
        currentParentId = cat2!.id;
        finalCategoryId = cat2!.id;
      }
      if (cat3Name && currentParentId) {
        const cat3 = await ensureCategory(cat3Name, currentParentId);
        finalCategoryId = cat3!.id;
      }

      if (!finalCategoryId) {
        console.warn(`Skipping ${name} - no category specified.`);
        continue;
      }

      // 2. Ensure Product
      const productSlug = slugify(name);
      const description = row['Description']?.trim() || '';

      let product = await db.product.findUnique({
        where: { slug: productSlug }
      });

      if (!product) {
        product = await db.product.create({
          data: {
            name,
            slug: productSlug,
            description,
            categoryId: finalCategoryId,
            status: 'active',
            images: '[]' // Explicitly empty array for images initially
          }
        });
        productCount++;
      }

      // 3. Ensure Variant
      const size = row['Size (optional)']?.trim() || null;
      const color = row['Color (optional)']?.trim() || null;
      const sku = slugify(`${productSlug}-${size || 'nosize'}-${color || 'nocolor'}`);
      
      const priceVal = parseFloat(row['Price (GHS)']);
      if (isNaN(priceVal)) {
        console.warn(`Skipping variant ${sku} - invalid price.`);
        continue;
      }
      const priceP = Math.round(priceVal * 100);
      
      const stockVal = parseInt(row['Stock'], 10);
      const stockQuantity = isNaN(stockVal) ? 0 : stockVal;

      let variant = await db.productVariant.findUnique({
        where: { sku }
      });

      if (!variant) {
        await db.productVariant.create({
          data: {
            productId: product.id,
            sku,
            size,
            color,
            priceP,
            stockQuantity,
            reservedStock: 0,
            lowStockThreshold: 3
          }
        });
        variantCount++;
      } else {
        await db.productVariant.update({
          where: { id: variant.id },
          data: {
            stockQuantity,
            priceP
          }
        });
      }

    } catch (e) {
      console.error(`Error processing row:`, row, e);
    }
  }

  console.log(`\nImport complete!`);
  console.log(`New Products Created: ${productCount}`);
  console.log(`New Variants Created: ${variantCount}`);
  process.exit(0);
}

const csvPath = process.argv[2] || path.join(process.cwd(), '../../products_template.csv');
importCSV(csvPath).catch(console.error);
