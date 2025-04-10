export async function checkAuthStatus() {
  try {
    const response = await fetch('/api/checkAuth');
    const data = await response.json();
    return data.authenticated;
  } catch (error) {
    console.error('Error checking auth status:', error);
    return false;
  }
}

export async function authenticateGmail() {
  try {
    const response = await fetch('/api/auth');
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error authenticating Gmail:', error);
    return { success: false, error };
  }
}

export async function updateLatestTransactions() {
  try {
    const response = await fetch('/api/updateTransactions', {
      method: 'POST',
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating transactions:', error);
    return { success: false, error };
  }
} 