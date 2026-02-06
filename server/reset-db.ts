import { db } from './db';
import { 
  users, 
  menuItems, 
  tables, 
  orders, 
  dayTemplates, 
  userProfiles, 
  restaurants, 
  menus, 
  menuCategories, 
  tableLayouts 
} from '@shared/schema';

async function resetDatabase() {
  try {
    console.log('Starting database reset...');

    // Drop all tables in reverse order of dependencies
    console.log('Dropping tables...');
    await db.delete(orders);
    await db.delete(dayTemplates);
    await db.delete(menuItems);
    await db.delete(menuCategories);
    await db.delete(menus);
    await db.delete(tables);
    await db.delete(tableLayouts);
    await db.delete(restaurants);
    await db.delete(userProfiles);
    await db.delete(users);

    console.log('All tables dropped successfully');

    console.log('Database reset complete!');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
}

// Run the reset
resetDatabase()
  .then(() => {
    console.log('Database reset completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database reset failed:', error);
    process.exit(1);
  }); 