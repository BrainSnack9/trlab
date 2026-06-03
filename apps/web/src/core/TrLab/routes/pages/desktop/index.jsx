'use client';

import CardNews from '@/core/TrLab/Components/Desktop/Systems/TrLab/CardNews';
import Collection from '@/core/TrLab/Components/Desktop/Systems/TrLab/Collection';
import Dashboard from '@/core/TrLab/Components/Desktop/Systems/TrLab/Dashboard';
import Plan from '@/core/TrLab/Components/Desktop/Systems/TrLab/Plan';
import Profiles from '@/core/TrLab/Components/Desktop/Systems/TrLab/Profiles';
import Search from '@/core/TrLab/Components/Desktop/Systems/TrLab/Search';
import Settings from '@/core/TrLab/Components/Desktop/Systems/TrLab/Settings';
import Studio from '@/core/TrLab/Components/Desktop/Systems/TrLab/Studio';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';
import {
  ROUTER_TRLAB_CARDNEWS,
  ROUTER_TRLAB_COLLECTION,
  ROUTER_TRLAB_DASHBOARD,
  ROUTER_TRLAB_PLAN,
  ROUTER_TRLAB_PROFILES,
  ROUTER_TRLAB_SEARCH,
  ROUTER_TRLAB_SETTINGS,
  ROUTER_TRLAB_STUDIO
} from '@/core/TrLab/routes/paths/desktop.path';

export const desktopRouteList = [
  { path: ROUTER_TRLAB_DASHBOARD, element: Dashboard },
  { path: ROUTER_TRLAB_PROFILES, element: Profiles },
  { path: ROUTER_TRLAB_COLLECTION, element: Collection },
  { path: ROUTER_TRLAB_SETTINGS, element: Settings },
  { path: ROUTER_TRLAB_SEARCH, element: Search },
  { path: ROUTER_TRLAB_STUDIO, element: Studio },
  { path: ROUTER_TRLAB_PLAN, element: Plan },
  { path: ROUTER_TRLAB_CARDNEWS, element: CardNews }
];

export default function DesktopRoutes() {
  const { view } = useTrLabWorkspace();
  const activeRoute = desktopRouteList.find((route) => route?.path === view) ?? desktopRouteList[0];
  const ActiveSystem = activeRoute?.element ?? Dashboard;

  return <ActiveSystem />;
}
