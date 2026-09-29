import React from 'react';
import IncomingCallModal from './IncomingCallModal';
import OutgoingCallModal from './OutgoingCallModal';
import ActiveCallModal from './ActiveCallModal';

export default function VideoCallManager() {
  return (
    <>
      <IncomingCallModal />
      <OutgoingCallModal />
      <ActiveCallModal />
    </>
  );
}
