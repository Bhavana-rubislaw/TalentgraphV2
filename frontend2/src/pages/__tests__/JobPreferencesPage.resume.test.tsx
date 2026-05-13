/**
 * Frontend Test Suite for Resume Parsing Feature
 * 
 * NOTE: This is a TEMPLATE/EXAMPLE for future automated frontend testing.
 * Currently, the frontend doesn't have a testing framework set up.
 * 
 * To use these tests:
 * 1. Install testing dependencies:
 *    npm install --save-dev @testing-library/react @testing-library/jest-dom 
 *    @testing-library/user-event jest @types/jest vitest jsdom
 * 
 * 2. Configure Vitest in vite.config.ts:
 *    import { defineConfig } from 'vite'
 *    import react from '@vitejs/plugin-react'
 *    
 *    export default defineConfig({
 *      plugins: [react()],
 *      test: {
 *        globals: true,
 *        environment: 'jsdom',
 *        setupFiles: './src/setupTests.ts',
 *      },
 *    })
 * 
 * 3. Add to package.json:
 *    "scripts": {
 *      "test": "vitest",
 *      "test:ui": "vitest --ui",
 *      "test:coverage": "vitest --coverage"
 *    }
 * 
 * 4. Run tests:
 *    npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import JobPreferencesPage from '../JobPreferencesPage';
import * as apiClient from '../../api/client';

// Mock API client
vi.mock('../../api/client', () => ({
  parseResumeForJobPreferences: vi.fn(),
  getJobProfiles: vi.fn(() => Promise.resolve({ data: [] })),
  getResumes: vi.fn(() => Promise.resolve({ data: [] })),
  getCertifications: vi.fn(() => Promise.resolve({ data: [] })),
  getCandidateSkillCatalogs: vi.fn(() => Promise.resolve({ data: { technical_skills: [], soft_skills: [] } })),
}));

// Mock react-router-dom navigation
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Helper to render component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Resume Parsing Feature - Component Tests', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Upload Button Visibility', () => {
    
    it('should show upload button when creating new preference', async () => {
      renderWithRouter(<JobPreferencesPage />);
      
      // Wait for page to load and click "Add Preference"
      await waitFor(() => {
        const addButton = screen.getByText(/add preference/i);
        expect(addButton).toBeDefined();
      });
      
      const addButton = screen.getByText(/add preference/i);
      fireEvent.click(addButton);
      
      // Verify upload button appears
      await waitFor(() => {
        const uploadButton = screen.getByText(/upload resume/i);
        expect(uploadButton).toBeDefined();
      });
    });

    it('should hide upload button in edit mode', async () => {
      // Mock existing profiles
      vi.mocked(apiClient.getJobProfiles).mockResolvedValueOnce({
        data: [{ id: 1, profile_name: 'Test Profile' }]
      } as any);
      
      renderWithRouter(<JobPreferencesPage />);
      
      // Wait for profile to load, click edit
      await waitFor(() => {
        const editButton = screen.getByText(/edit/i);
        fireEvent.click(editButton);
      });
      
      // Verify upload button NOT present
      const uploadButton = screen.queryByText(/upload resume/i);
      expect(uploadButton).toBeNull();
    });
  });

  describe('File Validation', () => {
    
    it('should accept valid PDF file', async () => {
      renderWithRouter(<JobPreferencesPage />);
      
      // Navigate to create mode
      const addButton = screen.getByText(/add preference/i);
      fireEvent.click(addButton);
      
      // Create mock file
      const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
      
      // Mock successful API response
      vi.mocked(apiClient.parseResumeForJobPreferences).mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Resume parsed successfully',
          data: {
            skills: ['Python', 'React'],
            skills_confidence: 0.8,
            years_of_experience: 5,
            years_of_experience_confidence: 0.7,
            seniority_level: 'senior',
            seniority_level_confidence: 0.9,
          }
        }
      } as any);
      
      // Trigger file upload
      const uploadInput = screen.getByLabelText(/upload resume/i);
      await userEvent.upload(uploadInput, file);
      
      // Verify API was called
      await waitFor(() => {
        expect(apiClient.parseResumeForJobPreferences).toHaveBeenCalledTimes(1);
      });
    });

    it('should reject invalid file type', async () => {
      renderWithRouter(<JobPreferencesPage />);
      
      const addButton = screen.getByText(/add preference/i);
      fireEvent.click(addButton);
      
      // Create invalid file
      const file = new File(['dummy'], 'resume.exe', { type: 'application/x-msdownload' });
      
      const uploadInput = screen.getByLabelText(/upload resume/i);
      await userEvent.upload(uploadInput, file);
      
      // Verify error toast appears
      await waitFor(() => {
        const errorToast = screen.getByText(/invalid file type/i);
        expect(errorToast).toBeDefined();
      });
      
      // Verify API was NOT called
      expect(apiClient.parseResumeForJobPreferences).not.toHaveBeenCalled();
    });

    it('should reject files over 10MB', async () => {
      renderWithRouter(<JobPreferencesPage />);
      
      const addButton = screen.getByText(/add preference/i);
      fireEvent.click(addButton);
      
      // Create large file (mock size)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'huge.pdf', { 
        type: 'application/pdf' 
      });
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });
      
      const uploadInput = screen.getByLabelText(/upload resume/i);
      await userEvent.upload(uploadInput, largeFile);
      
      // Verify error message
      await waitFor(() => {
        const errorMessage = screen.getByText(/file size must be under 10mb/i);
        expect(errorMessage).toBeDefined();
      });
    });
  });

  describe('Field Auto-Population', () => {
    
    it('should populate form fields with parsed data', async () => {
      renderWithRouter(<JobPreferencesPage />);
      
      const addButton = screen.getByText(/add preference/i);
      fireEvent.click(addButton);
      
      const mockParsedData = {
        success: true,
        message: 'Resume parsed successfully',
        data: {
          skills: ['Python', 'React', 'AWS'],
          skills_confidence: 0.9,
          years_of_experience: 10,
          years_of_experience_confidence: 0.8,
          seniority_level: 'senior',
          seniority_level_confidence: 0.9,
          highest_education: 'master',
          highest_education_confidence: 0.85,
          job_titles: ['Senior Engineer', 'Lead Developer'],
          job_titles_confidence: 0.7,
        }
      };
      
      vi.mocked(apiClient.parseResumeForJobPreferences).mockResolvedValueOnce({
        data: mockParsedData
      } as any);
      
      // Upload file
      const file = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' });
      const uploadInput = screen.getByLabelText(/upload resume/i);
      await userEvent.upload(uploadInput, file);
      
      // Wait for parsing to complete
      await waitFor(() => {
        expect(apiClient.parseResumeForJobPreferences).toHaveBeenCalled();
      });
      
      // Verify fields are populated
      await waitFor(() => {
        // Check seniority dropdown
        const senioritySelect = screen.getByLabelText(/seniority level/i) as HTMLSelectElement;
        expect(senioritySelect.value).toBe('senior');
        
        // Check education dropdown
        const educationSelect = screen.getByLabelText(/highest education/i) as HTMLSelectElement;
        expect(educationSelect.value).toBe('master');
        
        // Check years of experience
        const experienceInput = screen.getByLabelText(/years of experience/i) as HTMLInputElement;
        expect(experienceInput.value).toBe('10');
      });
    });

    it('should show success toast with field count', async () => {
      renderWithRouter(<JobPreferencesPage />);
      
      const addButton = screen.getByText(/add preference/i);
      fireEvent.click(addButton);
      
      vi.mocked(apiClient.parseResumeForJobPreferences).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            skills: ['Python'],
            skills_confidence: 0.8,
            years_of_experience: 5,
            years_of_experience_confidence: 0.7,
            seniority_level: 'mid',
            seniority_level_confidence: 0.6,
          }
        }
      } as any);
      
      const file = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
      const uploadInput = screen.getByLabelText(/upload resume/i);
      await userEvent.upload(uploadInput, file);
      
      // Verify success toast
      await waitFor(() => {
        const successMessage = screen.getByText(/auto-filled.*field/i);
        expect(successMessage).toBeDefined();
      });
    });
  });

  describe('Loading States', () => {
    
    it('should show loading state during upload', async () => {
      renderWithRouter(<JobPreferencesPage />);
      
      const addButton = screen.getByText(/add preference/i);
      fireEvent.click(addButton);
      
      // Mock delayed API response
      vi.mocked(apiClient.parseResumeForJobPreferences).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: {} } as any), 1000))
      );
      
      const file = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
      const uploadInput = screen.getByLabelText(/upload resume/i);
      await userEvent.upload(uploadInput, file);
      
      // Verify loading indicator appears
      await waitFor(() => {
        const loadingText = screen.getByText(/parsing/i);
        expect(loadingText).toBeDefined();
      });
    });

    it('should disable upload button during parsing', async () => {
      renderWithRouter(<JobPreferencesPage />);
      
      const addButton = screen.getByText(/add preference/i);
      fireEvent.click(addButton);
      
      vi.mocked(apiClient.parseResumeForJobPreferences).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: {} } as any), 500))
      );
      
      const file = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
      const uploadInput = screen.getByLabelText(/upload resume/i);
      await userEvent.upload(uploadInput, file);
      
      // Try to upload again immediately (should be prevented)
      const uploadButton = screen.getByText(/parsing/i).closest('button');
      expect(uploadButton).toHaveProperty('disabled', true);
    });
  });

  describe('Error Handling', () => {
    
    it('should show error toast on API failure', async () => {
      renderWithRouter(<JobPreferencesPage />);
      
      const addButton = screen.getByText(/add preference/i);
      fireEvent.click(addButton);
      
      // Mock API error
      vi.mocked(apiClient.parseResumeForJobPreferences).mockRejectedValueOnce({
        response: {
          data: {
            detail: 'Failed to parse resume'
          }
        }
      });
      
      const file = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
      const uploadInput = screen.getByLabelText(/upload resume/i);
      await userEvent.upload(uploadInput, file);
      
      // Verify error toast
      await waitFor(() => {
        const errorMessage = screen.getByText(/failed to parse resume/i);
        expect(errorMessage).toBeDefined();
      });
    });

    it('should not corrupt form on parsing error', async () => {
      renderWithRouter(<JobPreferencesPage />);
      
      const addButton = screen.getByText(/add preference/i);
      fireEvent.click(addButton);
      
      // Fill in profile name first
      const profileNameInput = screen.getByLabelText(/profile name/i) as HTMLInputElement;
      await userEvent.type(profileNameInput, 'My Test Profile');
      
      // Mock API error
      vi.mocked(apiClient.parseResumeForJobPreferences).mockRejectedValueOnce(
        new Error('Network error')
      );
      
      const file = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
      const uploadInput = screen.getByLabelText(/upload resume/i);
      await userEvent.upload(uploadInput, file);
      
      // Wait for error
      await waitFor(() => {
        expect(apiClient.parseResumeForJobPreferences).toHaveBeenCalled();
      });
      
      // Verify profile name still intact
      expect(profileNameInput.value).toBe('My Test Profile');
    });
  });

  describe('Input Focus Bug Regression', () => {
    
    it('should allow continuous typing without focus loss', async () => {
      renderWithRouter(<JobPreferencesPage />);
      
      const addButton = screen.getByText(/add preference/i);
      fireEvent.click(addButton);
      
      // Type in profile name field
      const profileNameInput = screen.getByLabelText(/profile name/i) as HTMLInputElement;
      
      // Type full string without interruption
      await userEvent.type(profileNameInput, 'Oracle Cloud Senior Developer');
      
      // Verify full text was entered
      expect(profileNameInput.value).toBe('Oracle Cloud Senior Developer');
      
      // Verify focus remains on input
      expect(document.activeElement).toBe(profileNameInput);
    });
  });
});

/**
 * Integration Test Examples
 */
describe('Resume Parsing - Integration Tests', () => {
  
  it('should complete full workflow from upload to save', async () => {
    renderWithRouter(<JobPreferencesPage />);
    
    // 1. Click add preference
    const addButton = screen.getByText(/add preference/i);
    fireEvent.click(addButton);
    
    // 2. Upload resume
    vi.mocked(apiClient.parseResumeForJobPreferences).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          skills: ['Python'],
          skills_confidence: 0.8,
          seniority_level: 'senior',
          seniority_level_confidence: 0.9,
        }
      }
    } as any);
    
    const file = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
    const uploadInput = screen.getByLabelText(/upload resume/i);
    await userEvent.upload(uploadInput, file);
    
    // 3. Wait for parsing
    await waitFor(() => {
      expect(apiClient.parseResumeForJobPreferences).toHaveBeenCalled();
    });
    
    // 4. Fill required fields
    const profileNameInput = screen.getByLabelText(/profile name/i);
    await userEvent.type(profileNameInput, 'Test Profile');
    
    // 5. Save (would need to mock save API)
    // const saveButton = screen.getByText(/save preference/i);
    // fireEvent.click(saveButton);
    
    // Verify workflow completed without errors
    expect(screen.queryByText(/error/i)).toBeNull();
  });
});
