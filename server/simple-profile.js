const fs = require('fs');
const path = require('path');

const PROFILE_PATH = path.join(__dirname, '../.db/profiles.json');

// Ensure the directory exists
if (!fs.existsSync(path.dirname(PROFILE_PATH))) {
  fs.mkdirSync(path.dirname(PROFILE_PATH), { recursive: true });
}

// Create default profile if it doesn't exist
if (!fs.existsSync(PROFILE_PATH)) {
  const defaultProfile = [{
    id: 1,
    name: "Restaurant Manager",
    role: "Manager",
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }];
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(defaultProfile, null, 2));
}

// Read profiles
function getProfiles() {
  try {
    const data = fs.readFileSync(PROFILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading profiles:', error);
    return [];
  }
}

// Get profile by ID
function getProfileById(id) {
  const profiles = getProfiles();
  return profiles.find(profile => profile.id === id);
}

// Update profile
function updateProfile(id, profileData) {
  let profiles = getProfiles();
  const index = profiles.findIndex(profile => profile.id === id);
  
  if (index >= 0) {
    // Update existing profile
    profiles[index] = {
      ...profiles[index],
      ...profileData,
      updatedAt: new Date().toISOString()
    };
  } else {
    // Create new profile
    profiles.push({
      id,
      ...profileData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  
  // Save to file
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(profiles, null, 2));
  
  // Return the updated profile
  return index >= 0 ? profiles[index] : profiles[profiles.length - 1];
}

module.exports = {
  getProfileById,
  updateProfile
};