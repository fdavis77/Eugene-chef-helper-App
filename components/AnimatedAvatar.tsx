import React, { useEffect, useRef } from 'react';
import type { AnimationItem } from 'lottie-web';

// A brand new, custom-designed Lottie animation that matches the user's creative brief:
// A friendly, "Casper-like" character with a chef hat and a thin mustache.
// This data is embedded directly in the component to provide a 100% reliable fix for the previous loading errors.
const animationData = {"v":"5.9.0","fr":30,"ip":0,"op":600,"w":200,"h":200,"nm":"Chef Ghost","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"Mouth","parent":2,"sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[100,125,0],"ix":2},"a":{"a":0,"k":[15,5,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ty":"el","s":{"a":1,"k":[{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":480,"s":[30,10]},{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":485,"s":[30,20]},{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":490,"s":[30,5]},{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":495,"s":[30,18]},{"t":500,"s":[30,10]}],"ix":2},"p":{"a":0,"k":[0,0],"ix":3},"nm":"Ellipse Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.1,0.1,0.1,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"nm":"Fill 1","mn":"ADBE Vector Group","hd":false}],"nm":"Mouth Shape","np":2,"cix":2,"ix":1,"mn":"ADBE Vector Group"}],"ip":480,"op":600,"st":480,"bm":0},{"ddd":0,"ind":2,"ty":4,"nm":"Body","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[100,100,0],"ix":2},"a":{"a":0,"k":[0,0,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ty":"path","ks":{"a":0,"k":{"i":[[0,0],[0,0],[-4.42,7.994],[0,0],[0,0],[0,0],[4.42,-7.994],[0,0]],"o":[[0,0],[4.42,7.994],[0,0],[0,0],[0,0],[-4.42,-7.994],[0,0],[0,0]],"v":[[-50,40],[50,40],[41.667,25],[40,20],[40,-50],[-40,-50],[-41.667,25],[-50,40]],"c":true},"ix":2},"nm":"Body Path","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[1,1,1,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"nm":"Fill 1","mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ty":"el","s":{"a":1,"k":[{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":60,"s":[16,16]},{"t":65,"s":[16,2]}],"ix":2},"p":{"a":0,"k":[-20,-10],"ix":3},"nm":"Ellipse Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.1,0.1,0.1,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"nm":"Fill 1","mn":"ADBE Vector Group","hd":false}],"nm":"Eye Left","np":2,"cix":2,"ix":3,"mn":"ADBE Vector Group"},{"ty":"gr","it":[{"ty":"el","s":{"a":1,"k":[{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":60,"s":[16,16]},{"t":65,"s":[16,2]}],"ix":2},"p":{"a":0,"k":[20,-10],"ix":3},"nm":"Ellipse Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.1,0.1,0.1,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"nm":"Fill 1","mn":"ADBE Vector Group","hd":false}],"nm":"Eye Right","np":2,"cix":2,"ix":4,"mn":"ADBE Vector Group"},{"ty":"gr","it":[{"ty":"path","ks":{"a":0,"k":{"i":[[0,0],[-1.105,0],[0,-0.828],[0.828,0],[0,0],[1.105,0],[0,0.828],[-0.828,0]],"o":[[1.105,0],[0,0],[0,0.828],[-0.828,0],[-1.105,0],[0,0],[0,-0.828],[0.828,0]],"v":[[10,15],[5,15],[5,16.5],[3.5,16.5],[0,10],[-5,15],[-5,16.5],[-3.5,16.5]],"c":true},"ix":2},"nm":"Moustache","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.2,0.2,0.2,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"nm":"Fill 1","mn":"ADBE Vector Group","hd":false}],"nm":"Moustache Group","np":2,"cix":2,"ix":5,"mn":"ADBE Vector Group"}],"nm":"Body Group","np":5,"cix":2,"ix":1,"mn":"ADBE Vector Group"},{"ty":"gr","it":[{"ty":"path","ks":{"a":0,"k":{"i":[[0,0],[0,-13.807],[0,0],[0,0]],"o":[[0,0],[0,13.807],[0,0],[0,0]],"v":[[-25,-70],[0,-95],[25,-70],[-25,-70]],"c":true},"ix":2},"nm":"Hat Top","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"path","ks":{"a":0,"k":{"i":[[0,0],[0,0]],"o":[[0,0],[0,0]],"v":[[-30,-50],[-30,-70],[30,-70],[30,-50]],"c":true},"ix":2},"nm":"Hat Base","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.9,0.9,0.9,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"nm":"Fill 1","mn":"ADBE Vector Group","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":360,"s":[0]},{"t":480,"s":[360]}],"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Hat","np":4,"cix":2,"ix":2,"mn":"ADBE Vector Group"}],"ip":0,"op":600,"st":0,"bm":0,"xt":1,"comp_version":"2022.0.0"}],"markers":[{"cm":"Idle","tm":0,"dr":120},{"cm":"Blink","tm":60,"dr":5},{"cm":"Listening","tm":120,"dr":120},{"cm":"Thinking","tm":240,"dr":120},{"cm":"Thinking Spin","tm":360,"dr":120},{"cm":"Speaking","tm":480,"dr":120}]};

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