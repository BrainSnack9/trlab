'use client';

import CardNews from '@/core/TrLab/Components/Desktop/Systems/TrLab/CardNews';
import Collection from '@/core/TrLab/Components/Desktop/Systems/TrLab/Collection';
import Home from '@/core/TrLab/Components/Desktop/Systems/TrLab/Home';
import Metadata from '@/core/TrLab/Components/Desktop/Systems/TrLab/Metadata';
import Plan from '@/core/TrLab/Components/Desktop/Systems/TrLab/Plan';
import Planning from '@/core/TrLab/Components/Desktop/Systems/TrLab/Planning';
import Profiles from '@/core/TrLab/Components/Desktop/Systems/TrLab/Profiles';
import Settings from '@/core/TrLab/Components/Desktop/Systems/TrLab/Settings';
import Studio from '@/core/TrLab/Components/Desktop/Systems/TrLab/Studio';
import Templates from '@/core/TrLab/Components/Desktop/Systems/TrLab/Templates';
import WorkOverview from '@/core/TrLab/Components/Desktop/Systems/TrLab/WorkOverview';
import Works from '@/core/TrLab/Components/Desktop/Systems/TrLab/Works';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';
import {
  ROUTER_TRLAB_CARDNEWS,
  ROUTER_TRLAB_COLLECTION,
  ROUTER_TRLAB_METADATA,
  ROUTER_TRLAB_PLAN,
  ROUTER_TRLAB_PLANNING,
  ROUTER_TRLAB_PROFILES,
  ROUTER_TRLAB_SETTINGS,
  ROUTER_TRLAB_STUDIO,
  ROUTER_TRLAB_TEMPLATES,
  ROUTER_TRLAB_WORKS
} from '@/core/TrLab/routes/paths/desktop.path';

export const desktopRouteList = [
  { path: 'overview', element: WorkOverview },
  { path: ROUTER_TRLAB_METADATA, element: Metadata },
  { path: ROUTER_TRLAB_TEMPLATES, element: Templates },
  { path: ROUTER_TRLAB_WORKS, element: Works },
  { path: ROUTER_TRLAB_PLANNING, element: Planning },
  { path: ROUTER_TRLAB_PROFILES, element: Profiles },
  { path: ROUTER_TRLAB_COLLECTION, element: Collection },
  { path: ROUTER_TRLAB_SETTINGS, element: Settings },
  { path: ROUTER_TRLAB_STUDIO, element: Studio },
  { path: ROUTER_TRLAB_PLAN, element: Plan },
  { path: ROUTER_TRLAB_CARDNEWS, element: CardNews }
];

export default function DesktopRoutes() {
  const { view } = useTrLabWorkspace();
  const activeRoute = desktopRouteList.find((route) => route?.path === view);
  if (!activeRoute) return <Home />;

  const ActiveSystem = activeRoute.element;

  return <ActiveSystem />;
}
