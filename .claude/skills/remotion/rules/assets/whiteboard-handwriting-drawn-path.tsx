import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

const COLOR_BG = '#FFFBEB';
const COLOR_INK = '#1F2937';
const STROKE_WIDTH = 8;
const DRAW_FRAMES = 60;

// Ideal composition size: 1920x1080
// Example: a hand-drawn check mark over a "right answer" — replace `D` and
// `PATH_LENGTH` with any path. Compute length once via
// new svgPathProperties(d).getTotalLength() at build time.

const D = 'M 200 400 Q 350 600, 500 350 T 900 200';
const PATH_LENGTH = 950; // precomputed via svg-path-properties

export const MyAnimation = () => {
	const frame = useCurrentFrame();
	const offset = interpolate(frame, [0, DRAW_FRAMES], [PATH_LENGTH, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill style={{backgroundColor: COLOR_BG}}>
			<svg
				width="100%"
				height="100%"
				viewBox="0 0 1920 1080"
				preserveAspectRatio="xMidYMid meet"
			>
				<path
					d={D}
					stroke={COLOR_INK}
					strokeWidth={STROKE_WIDTH}
					strokeLinecap="round"
					strokeLinejoin="round"
					fill="none"
					strokeDasharray={PATH_LENGTH}
					strokeDashoffset={offset}
				/>
			</svg>
		</AbsoluteFill>
	);
};
