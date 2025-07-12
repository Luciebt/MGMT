import '@testing-library/jest-dom';

// Mock Electron APIs
global.window = global.window || {};
global.window.electronAPI = {
  openRootDirectory: vi.fn(),
  getProjects: vi.fn(),
  addTag: vi.fn(),
  addProjectTag: vi.fn(),
  getTags: vi.fn(),
  getProjectTags: vi.fn(),
  filterProjects: vi.fn(),
  readAls: vi.fn(),
  updateMetadata: vi.fn(),
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
