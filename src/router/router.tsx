import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routes'

// Create the router instance
export const router = createRouter({ 
  routeTree,
  defaultPreload: 'intent'
})

// Declare types for your router
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
} 