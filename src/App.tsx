import { Box, Button, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<string[] | null>;
    };
  }
}

function App() {
  const [count, setCount] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const handleOpenFile = async () => {
    const filePaths = await window.electronAPI.openFile();
    if (filePaths) {
      setSelectedFiles(filePaths);
    }
  };

  return (
    <VStack p={4}>
      <Text fontSize="2xl">Vite + React + Electron + Chakra UI</Text>
      <Box p={5} shadow="md" borderWidth="1px">
        <Text fontSize="xl">Count is {count}</Text>
        <Button mt={4} onClick={() => setCount(count + 1)}>
          Increment
        </Button>
      </Box>

      <Box p={5} shadow="md" borderWidth="1px" mt={4}>
        <Button onClick={handleOpenFile}>
          Select Ableton Live Set(s)
        </Button>
        {selectedFiles.length > 0 && (
          <VStack align="start" mt={4}>
            <Text>Selected Files:</Text>
            {selectedFiles.map((file, index) => (
              <Text key={index} fontSize="sm">{file}</Text>
            ))}
          </VStack>
        )}
      </Box>

      <Text mt={4}>
        Edit <code>src/App.tsx</code> and save to test HMR
      </Text>
    </VStack>
  );
}

export default App;
