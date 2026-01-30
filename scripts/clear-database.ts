import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function clearDatabase() {
  console.log('Clearing all tables...');

  const tables = [
    'workday_workers',
    'workdays',
    'restaurant_workers',
    'orders',
    'tables',
    'menu_items',
    'menu_categories',
    'menus',
    'table_layouts',
    'day_templates',
    'user_profiles',
    'restaurants',
    'users'
  ];

  for (const table of tables) {
    try {
      await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`));
      console.log(`Cleared: ${table}`);
    } catch (err: any) {
      console.log(`Skipped ${table}: ${err.message}`);
    }
  }

  console.log('\nDatabase cleared successfully!');
  process.exit(0);
}

clearDatabase();
