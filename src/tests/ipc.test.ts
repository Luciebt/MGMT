import { expect, test } from 'vitest';

// Mock the electronAPI that's exposed in the preload script
const mockOpenFile = vitest.fn(() => Promise.resolve(['/path/to/test.als']));

// Simulate the global electronAPI object
(global as any).electronAPI = {
  openFile: mockOpenFile,
};

test('electronAPI.openFile should call ipcRenderer.invoke and return file paths', async () => {
  const result = await (global as any).electronAPI.openFile();

  expect(mockOpenFile).toHaveBeenCalled();
  expect(result).toEqual(['/path/to/test.als']);
});
