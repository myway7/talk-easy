import * as React from 'react';
import {  useObservableState } from '@/livekit-react-offical/hooks/internal';
import { setupDeviceSelector, createMediaDeviceObserver } from '@livekit/components-core';
import { mergeProps } from '@/livekit-react-offical/utils';
import { useMaybeRoomContext } from '@livekit/components-react';
import type { Room } from 'livekit-client';

export function useMediaDevices({ kind }: { kind: MediaDeviceKind }) {
  const deviceObserver = React.useMemo(() => createMediaDeviceObserver(kind), [kind]);
  const devices = useObservableState(deviceObserver, []);
  return devices;
}

export interface UseMediaDeviceSelectProps {
  kind: MediaDeviceKind;
  room?: Room;
}

export function useMediaDeviceSelect({ kind, room }: UseMediaDeviceSelectProps) {
  const roomContext = useMaybeRoomContext();
  // List of all devices.
  const deviceObserver = React.useMemo(() => createMediaDeviceObserver(kind), [kind]);
  const devices = useObservableState(deviceObserver, []);
  // Active device management.
  const [currentDeviceId, setCurrentDeviceId] = React.useState<string>('');
  const { className, activeDeviceObservable, setActiveMediaDevice } = React.useMemo(
    () => setupDeviceSelector(kind, room ?? roomContext),
    [kind, room, roomContext],
  );

  React.useEffect(() => {
    const listener = activeDeviceObservable.subscribe((deviceId) => {
      if (deviceId) setCurrentDeviceId(deviceId);
    });
    return () => {
      listener?.unsubscribe();
    };
  }, [activeDeviceObservable]);

  return { devices, className, activeDeviceId: currentDeviceId, setActiveMediaDevice };
}

export interface MediaDeviceSelectProps extends React.HTMLAttributes<HTMLUListElement> {
  kind: MediaDeviceKind;
  onActiveDeviceChange?: (deviceId: string) => void;
  onDeviceListChange?: (devices: MediaDeviceInfo[]) => void;
  initialSelection?: string;
}

/**
 * The MediaDeviceSelect list all media devices of one kind.
 * Clicking on one of the listed devices make it the active media device.
 *
 * @example
 * ```tsx
 * <LiveKitRoom>
 *   <MediaDeviceSelect kind='audioinput' />
 * </LiveKitRoom>
 * ```
 */
export function MediaDeviceSelect({
  kind,
  initialSelection,
  onActiveDeviceChange,
  onDeviceListChange,
  ...props
}: MediaDeviceSelectProps) {
  const room = useMaybeRoomContext();
  const { devices, activeDeviceId, setActiveMediaDevice, className } = useMediaDeviceSelect({
    kind,
    room,
  });
  React.useEffect(() => {
    if (initialSelection) {
      setActiveMediaDevice(initialSelection);
    }
  });

  React.useEffect(() => {
    if (typeof onDeviceListChange === 'function') {
      onDeviceListChange(devices);
    }
  }, [onDeviceListChange, devices]);

  const handleActiveDeviceChange = async (deviceId: string) => {
    setActiveMediaDevice(deviceId);
    onActiveDeviceChange?.(deviceId);
  };
  // Merge Props
  const mergedProps = React.useMemo(
    () => mergeProps(props, { className }, { className: 'lk-list' }),
    [className, props],
  );

  return (
    <ul {...mergedProps}>
      {devices.map((device) => {
        const classn = device.deviceId === activeDeviceId ? ' bg-secondary-content' : 'bg-primary';
        const cl = classn + " rounded-md"
        return (
            <li
                key={device.deviceId}
                id={device.deviceId}
                className={cl}
                aria-selected={device.deviceId === activeDeviceId}
                role="option"
                >
                <button className="lk-button w-full overflow-hidden" onClick={() => handleActiveDeviceChange(device.deviceId)}>
                    <div className='text-left w-full text-ellipsis overflow-hidden'>
                        {device.label}
                    </div>
                </button>
            </li>
        )
      }
    //   (
    //     <li
    //       key={device.deviceId}
    //       id={device.deviceId}
    //       data-lk-active={device.deviceId === activeDeviceId}
    //       aria-selected={device.deviceId === activeDeviceId}
    //       role="option"
    //     >
    //       <button className="lk-button" onClick={() => handleActiveDeviceChange(device.deviceId)}>
    //         {device.label}
    //       </button>
    //     </li>
    //   )
      
      )}
    </ul>
  );
}
