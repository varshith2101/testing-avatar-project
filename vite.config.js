import { defineConfig } from 'vite';

export default defineConfig({
  // Uncomment and set this if deploying to GitHub Pages
  // base: '/your-repo-name/',
  
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'mediapipe': ['@mediapipe/tasks-vision']
        }
      }
    }
  },
  
  optimizeDeps: {
    include: ['@mediapipe/tasks-vision', 'three']
  }
});
