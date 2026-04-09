import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { RouteMeta } from '../../src/routes/routeMeta';

interface AppShellProps {
  meta: RouteMeta;
  sceneKey: string;
  desktopSidebar: React.ReactNode;
  desktopHeader?: React.ReactNode;
  mobileTopBar?: React.ReactNode;
  rightPanel?: React.ReactNode;
  mobileBottomDock?: React.ReactNode;
  children: React.ReactNode;
}

const getSceneMotion = (preset: RouteMeta['transitionPreset']) => {
  switch (preset) {
    case 'slide-right':
      return { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 8 } };
    case 'slide-left':
      return { initial: { opacity: 0, x: 12 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -8 } };
    case 'modal':
      return { initial: { opacity: 0, scale: 0.985, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.99, y: 8 } };
    default:
      return { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };
  }
};

export const AppShell: React.FC<AppShellProps> = ({
  meta,
  sceneKey,
  desktopSidebar,
  desktopHeader,
  mobileTopBar,
  rightPanel,
  mobileBottomDock,
  children,
}) => {
  const reduceMotion = useReducedMotion();
  const motionState = getSceneMotion(meta.transitionPreset);

  return (
    <div className={`app-shell ${meta.immersive ? 'route-shell--immersive' : ''}`}>
      <div className="app-shell__inner">
        <aside className="app-shell__sidebar">{desktopSidebar}</aside>

        <div className="app-shell__main">
          <div className="app-shell__canvas">
            <div className="hidden lg:block">{desktopHeader}</div>
            <div className="lg:hidden">{mobileTopBar}</div>

            <AnimatePresence mode="wait">
              <motion.div
                key={sceneKey}
                className="app-shell__scene"
                initial={reduceMotion ? false : motionState.initial}
                animate={reduceMotion ? undefined : motionState.animate}
                exit={reduceMotion ? undefined : motionState.exit}
                transition={reduceMotion ? undefined : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <aside className="app-shell__panel">{rightPanel}</aside>
      </div>

      <div className="lg:hidden">{mobileBottomDock}</div>
    </div>
  );
};
