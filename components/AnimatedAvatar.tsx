import React, { useEffect, useRef } from 'react';
import type { AnimationItem } from 'lottie-web';
import animationData from '../assets/chef-bot-animation.json';

type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface AnimatedAvatarProps {
  state: AvatarState;
}

const animationSegments: Record<AvatarState, [number, number]> = {
  idle: [0, 119],
  listening: [120, 239],
  thinking: [240, 479], // Combined thinking and spinning into one state
  speaking: [480, 599],
};

// Declaring lottie as a global constant to satisfy TypeScript,
// as it's now loaded via a script tag in index.html.
declare const lottie: any;

// This component has been re-engineered to use the official `lottie-web` library directly.
// This is a more robust, low-level approach that resolves the previous issues where a
// React wrapper library was failing to initialize correctly in this specific environment.
const AnimatedAvatar: React.FC<AnimatedAvatarProps> = ({ state }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationInstanceRef = useRef<AnimationItem | null>(null);

  // Effect for initialization and cleanup.
  useEffect(() => {
    if (containerRef.current && !animationInstanceRef.current) {
      const anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: false,
        animationData: animationData,
      });
      animationInstanceRef.current = anim;
    }

    return () => {
      animationInstanceRef.current?.destroy();
      animationInstanceRef.current = null;
    };
  }, []);

  // Effect to change animation segment when state changes.
  useEffect(() => {
    const anim = animationInstanceRef.current;
    if (anim) {
      const segment = animationSegments[state];
      anim.playSegments(segment, true);
    }
  }, [state]);

  return <div ref={containerRef} className="w-48 h-48" />;
};

export default AnimatedAvatar;