import { createRouter, createRoute, createRootRoute, RouterProvider, Outlet } from '@tanstack/react-router';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { AIInsights } from './pages/AIInsights';
import { RiskManagement } from './pages/RiskManagement';
import { PositionRecovery } from './pages/PositionRecovery';
import { Statistics } from './pages/Statistics';
import { Settings } from './pages/Settings';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';

// Root route with layout
const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
});

const insightsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/insights',
  component: AIInsights,
});

const riskRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/risk',
  component: RiskManagement,
});

const recoveryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recovery',
  component: PositionRecovery,
});

const statisticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/statistics',
  component: Statistics,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: Settings,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  insightsRoute,
  riskRoute,
  recoveryRoute,
  statisticsRoute,
  settingsRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <RouterProvider router={router} />
      <Toaster
        theme="dark"
        toastOptions={{
          classNames: {
            toast: 'bg-card border-border text-foreground',
            title: 'text-foreground',
            description: 'text-muted-foreground',
          },
        }}
      />
    </ThemeProvider>
  );
}
