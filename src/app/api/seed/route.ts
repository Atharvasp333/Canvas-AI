import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import { NextResponse } from 'next/server';

// Initialize Supabase with SERVICE ROLE KEY to bypass RLS for inserts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log("🌱 Starting Seeding Process...");

    // 1. Generate 50 Products
    const products = Array.from({ length: 50 }).map(() => ({
      name: faker.commerce.productName(),
      category: faker.helpers.arrayElement(['Electronics', 'Clothing', 'Home', 'Office', 'Sports']),
      price: parseFloat(faker.commerce.price({ min: 10, max: 1000 })),
      stock_level: faker.number.int({ min: 0, max: 200 }),
    }));

    const { data: productData, error: productError } = await supabase
      .from('products')
      .insert(products)
      .select();

    if (productError) throw new Error(`Product Error: ${productError.message}`);

    // 2. Generate 20 Customers
    const customers = Array.from({ length: 20 }).map(() => ({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      region: faker.helpers.arrayElement(['North America', 'Europe', 'Asia', 'South America']),
      signup_date: faker.date.past({ years: 2 }).toISOString(),
    }));

    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .insert(customers)
      .select();

    if (customerError) throw new Error(`Customer Error: ${customerError.message}`);

    // 3. Generate 1000 Sales Transactions (Batching)
    if (!productData || !customerData) throw new Error("Failed to get foreign keys");

    const salesBatchSize = 100; 
    let totalSales = 0;

    // Loop 10 times = 1000 rows
    for (let i = 0; i < 10; i++) {
        const sales = Array.from({ length: salesBatchSize }).map(() => {
            const randomProduct = faker.helpers.arrayElement(productData);
            const randomCustomer = faker.helpers.arrayElement(customerData);
            const qty = faker.number.int({ min: 1, max: 10 });
            
            return {
                product_id: randomProduct.id,
                customer_id: randomCustomer.id,
                quantity: qty,
                total_amount: randomProduct.price * qty, 
                sale_date: faker.date.past({ years: 1 }).toISOString(),
                status: faker.helpers.arrayElement(['completed', 'completed', 'completed', 'pending', 'refunded']) 
            };
        });

        const { error: salesError } = await supabase.from('sales').insert(sales);
        if (salesError) throw new Error(`Sales Error: ${salesError.message}`);
        totalSales += sales.length;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Database seeded successfully with ${totalSales} sales!` 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}