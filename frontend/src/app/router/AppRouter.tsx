import { Suspense, lazy } from 'react';
import { Center, Loader } from '@mantine/core';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@app/layout/AppLayout';
import { routePaths } from './routes';

// routes each operation: home, encode, decode, explode, inspect, rebuild
const HomePage = lazy(async () => ({ default: (await import('@features/home')).HomePage }));
const EncodePage = lazy(async () => ({ default: (await import('@features/encode')).EncodePage }));
const DecodePage = lazy(async () => ({ default: (await import('@features/decode')).DecodePage }));
const ExplodePage = lazy(async () => ({ default: (await import('@features/explode')).ExplodePage }));
const InspectPage = lazy(async () => ({ default: (await import('@features/inspect')).InspectPage }));
const RebuildPage = lazy(async () => ({ default: (await import('@features/rebuild')).RebuildPage }));

function RouteFallback() {
  return (
    <Center mih={320}>
      <Loader />
    </Center>
  );
}
export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          path={routePaths.home}
          element={
            <Suspense fallback={<RouteFallback />}>
              <HomePage />
            </Suspense>
          }
        />

        <Route
          path={routePaths.encode}
          element={
            <Suspense fallback={<RouteFallback />}>
              <EncodePage />
            </Suspense>
          }
        />

        <Route
          path={routePaths.decode}
          element={
            <Suspense fallback={<RouteFallback />}>
              <DecodePage />
            </Suspense>
          }
        />

        <Route
          path={routePaths.explode}
          element={
            <Suspense fallback={<RouteFallback />}>
              <ExplodePage />
            </Suspense>
          }
        />

        <Route
          path={routePaths.inspect}
          element={
            <Suspense fallback={<RouteFallback />}>
              <InspectPage />
            </Suspense>
          }
        />
        
        <Route
          path={routePaths.rebuild}
          element={
            <Suspense fallback={<RouteFallback />}>
              <RebuildPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to={routePaths.home} replace />} />
      </Route>
    </Routes>
  );
}