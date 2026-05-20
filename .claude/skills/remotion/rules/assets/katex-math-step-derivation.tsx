import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {BlockMath} from 'react-katex';
import 'katex/dist/katex.min.css';

const COLOR_BG = '#0F172A';
const COLOR_TEXT = '#F1F5F9';
const COLOR_HIGHLIGHT = '#10B981';
const FONT_SIZE = 64;
const LINE_FRAMES = 45;
const FADE_FRAMES = 12;

// Ideal composition size: 1920x1080

const STEPS: {math: string; emphasize?: boolean}[] = [
	{math: String.raw`2x + 6 = 14`},
	{math: String.raw`2x + 6 - 6 = 14 - 6`},
	{math: String.raw`2x = 8`},
	{math: String.raw`\frac{2x}{2} = \frac{8}{2}`},
	{math: String.raw`x = \boxed{\color{#10B981}{4}}`, emphasize: true},
];

const Step: React.FC<{math: string; emphasize?: boolean}> = ({
	math,
	emphasize,
}) => {
	const frame = useCurrentFrame();
	const opacity = interpolate(frame, [0, FADE_FRAMES], [0, 1], {
		extrapolateRight: 'clamp',
	});
	const y = interpolate(frame, [0, FADE_FRAMES], [16, 0], {
		extrapolateRight: 'clamp',
	});

	return (
		<div
			style={{
				opacity,
				transform: `translateY(${y}px)`,
				color: emphasize ? COLOR_HIGHLIGHT : COLOR_TEXT,
				marginBottom: 24,
			}}
		>
			<BlockMath math={math} />
		</div>
	);
};

export const MyAnimation = () => {
	return (
		<AbsoluteFill
			style={{
				backgroundColor: COLOR_BG,
				fontSize: FONT_SIZE,
				justifyContent: 'center',
				alignItems: 'center',
				padding: 80,
			}}
		>
			<div>
				{STEPS.map((step, i) => (
					<Sequence
						key={i}
						from={i * LINE_FRAMES}
						durationInFrames={9999}
						layout="none"
					>
						<Step math={step.math} emphasize={step.emphasize} />
					</Sequence>
				))}
			</div>
		</AbsoluteFill>
	);
};
