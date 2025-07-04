import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  envDir: '../',
  
  plugins: [
    react(),
    tailwindcss(),
  ],
  
  resolve: {
    /* Be sure to update aliases in tsconfig.app.json as well */
    alias: {
      // Main src alias - '@' points to src folder
      '@': path.resolve(__dirname, './src'),
       
      // Component-specific aliases for better organization
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@lib': path.resolve(__dirname, './src/lib'),                // Third-party library configs
      '@stores': path.resolve(__dirname, './src/stores'),          // State management (Zustand, Redux)
      '@services': path.resolve(__dirname, './src/services'),      // API calls, external services
      '@pages': path.resolve(__dirname, './src/pages'),            // Route components (for React Router)

      // Backend integration for monorepo (Docker paths)
      '@backend-types': '/app/backend-dist/types',
      '@backend-src': '/app/backend-src',
    },
  },
  
  // ESBuild configuration - Vite uses ESBuild for fast TypeScript compilation
  esbuild: {
    target: 'esnext',
  },
  
  build: {
    // Build target for production
    // Targets browsers that support widely available web standards (roughly Chrome 91+)
    target: 'baseline-widely-available',
    
    // Generate source maps for debugging production builds
    sourcemap: true,
    
    rollupOptions: {
      output: {
        // Split vendor dependencies into separate chunks for better PRODUCTION caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router'],
          utils: ['axios'],          // HTTP client
        },
      },
    },
  },
  
  // Dependency optimization - tells Vite which dependencies to pre-bundle
  optimizeDeps: {
    // Pre-bundle these dependencies for faster DEV server startup
    include: [
      'react', 
      'react-dom', 
      'react-router',
      'axios'
    ],
    // Exclude backend types from optimization (they're not npm packages)
    exclude: ['@backend-types', '@backend-src']
  },
  
  // Development server configuration
  server: {
    // Docker-specific settings
    host: '0.0.0.0',  // Allow external connections (required for Docker)
    port: 3000,
    
    // Enable CORS for API development if you're running a separate backend
    cors: true,
    
    // Hot Module Replacement options
    hmr: {
      overlay: true,  // Show error overlay in browser during development
    },
    
    // Docker volume mount optimization
    watch: {
      usePolling: true,    // Required for Docker volume mounts
      interval: 1000,      // Check for changes every second
    }
  },
});