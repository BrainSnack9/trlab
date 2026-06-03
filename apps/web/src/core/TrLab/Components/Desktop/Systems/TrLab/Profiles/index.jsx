'use client';

import { ProfileView } from '@/core/TrLab/Components/Desktop/Organisms/TrLab/Profiles/ProfileView';
import useTrLabWorkspace from '@/core/TrLab/modules/controller/useTrLabWorkspace';

export default function Profiles() {
  const workspace = useTrLabWorkspace();

  return (
    <ProfileView
      channelProfiles={workspace.channelProfiles}
      saveChannelProfile={workspace.saveChannelProfile}
      deleteChannelProfile={workspace.deleteChannelProfile}
      selectedChannelProfiles={workspace.selectedChannelProfiles}
      setSelectedChannelProfiles={workspace.setSelectedChannelProfiles}
      accountSlots={workspace.accountSlots}
      setAccountSlots={workspace.setAccountSlots}
    />
  );
}
