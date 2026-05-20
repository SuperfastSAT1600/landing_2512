import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

const COLOR_BG = '#FFFBEB';
const COLOR_TEXT = '#1F2937';
const COLOR_HIGHLIGHT = '#EF4444';
const FONT_SIZE = 96;
const UNDERLINE_AT = 30;
const UNDERLINE_FRAMES = 18;

// Ideal composition size: 1920x1080
// Useful for emphasizing a vocabulary word, key term, or operation as the
// narrator says it.

const WORD = 'inverse';

export const MyAnimation = () => {
	const frame = useCurrentFrame();
	const width = 520; // rough width of the underline arc; tune to your word
	const path = `M 10 20 Q ${width / 2} 40, ${width} 15`;
	const length = width + 40;
	const offset = interpolate(
		frame,
		[UNDERLINE_AT, UNDERLINE_AT + UNDERLINE_FRAMES],
		[length, 0],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);

	return (
		<AbsoluteFill
			style={{
				backgroundColor: COLOR_BG,
				color: COLOR_TEXT,
				justifyContent: 'center',
				alignItems: 'center',
				fontFamily: 'Caveat, sans-serif',
				fontSize: FONT_SIZE,
				fontWeight: 700,
			}}
		>
			<div style={{position: 'relative'}}>
				<span>{WORD}</span>
				<svg
					width={width + 40}
					height={50}
					style={{position: 'absolute', left: 0, top: '100%'}}
				>
					<path
						d={path}
						stroke={COLOR_HIGHLIGHT}
						strokeWidth={8}
						strokeLinecap="round"
						fill="none"
						strokeDasharray={length}
						strokeDashoffset={offset}
					/>
				</svg>
			</div>
		</AbsoluteFill>
	);
};
