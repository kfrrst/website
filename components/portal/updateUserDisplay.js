/**
 * Update user display in portal header after login
 */
export function updateUserDisplay(user) {
  if (!user) return;
  
  // Update user avatar initials
  const userAvatar = document.querySelector('.user-avatar');
  if (userAvatar) {
    const initials = (user.firstName?.[0] || '') + (user.lastName?.[0] || '');
    userAvatar.textContent = initials.toUpperCase() || 'U';
  }
  
  // Update user name
  const userName = document.querySelector('.user-name');
  if (userName) {
    userName.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  }
  
  // Update any other user display elements
  const userEmail = document.querySelector('.user-email');
  if (userEmail) {
    userEmail.textContent = user.email;
  }
}