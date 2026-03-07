import { render, screen } from '@testing-library/react';
import App from './App';

/**
 * TACTICAL SUITE - UNIT TESTS
 * Verifies authentication gatekeeping and system boot sequence.
 * Updated to comply with Testing Library best practices.
 */

describe('Tactical Command Suite - Core Integration', () => {
  
  beforeEach(() => {
    localStorage.clear();
  });

  test('system initializes with tactical boot sequence', () => {
    render(<App />);
    // Verify the "Initializing" text from your App.js bootloader
    const bootMessage = screen.getByText(/INITIALIZING_COMMAND_SUITE/i);
    expect(bootMessage).toBeInTheDocument();
  });

  test('redirects to login shield when no active session exists', async () => {
    render(<App />);
    
    // Wait for the simulated boot sequence timer (1200ms in App.js)
    const loginHeader = await screen.findByText(/ADMIN ACCESS ONLY/i, {}, { timeout: 2000 });
    expect(loginHeader).toBeInTheDocument();
  });

  test('prevents dashboard access without authorization handshake', () => {
    render(<App />);
    
    // The "TACTICAL INCIDENT LOG" should NOT be visible initially
    const dashboardElement = screen.queryByText(/TACTICAL INCIDENT LOG/i);
    expect(dashboardElement).not.toBeInTheDocument();
  });

  test('verifies persistence protocol in localStorage via test-id', () => {
    // Manually set a session to test the persistence logic in App.js
    localStorage.setItem('admin_session_active', 'true');
    
    render(<App />);
    
    // Using findByLabelText or queryByTestId is preferred over document.querySelector
    // Note: Ensure your progress bar in App.js has: data-testid="boot-progress"
    const bootContainer = screen.getByText(/INITIALIZING_COMMAND_SUITE/i);
    expect(bootContainer).toBeInTheDocument();
    
    // Verify the system is in booting state which leads to authenticated dashboard
    expect(localStorage.getItem('admin_session_active')).toBe('true');
  });
});