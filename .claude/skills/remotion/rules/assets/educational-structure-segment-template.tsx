import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';

const COLOR_BG = '#0F172A';
const COLOR_TEXT = '#F1F5F9';
const COLOR_ACCENT = '#3B82F6';
const FPS = 30;

// Ideal composition size: 1920x1080
// Skeleton course-segment composition. Replace each Segment's children with
// actual lesson content. Total duration: 130s @ 30fps = 3900 frames.
// Segments: Hook | Objective | Concept | Worked Example | Trap | You-Try | Recap

const SEGMENTS = [
	{name: 'Hook', seconds: 6, label: 'HOOK'},
	{name: 'Objective', seconds: 4, label: 'YOU WILL LEARN'},
	{name: 'Concept', seconds: 60, label: 'CONCEPT'},
	{name: 'Worked Example', seconds: 30, label: 'EXAMPLE'},
	{name: 'Common Trap', seconds: 15, label: 'WATCH OUT'},
	{name: 'You Try', seconds: 10, label: 'YOUR TURN'},
	{name: 'Recap', seconds: 5, label: 'RECAP'},
];

const SegmentLabel: React.FC<{label: string}> = ({label}) => {
	const frame = useCurrentFrame();
	const opacity = interpolate(frame, [0, 12, 60, 75], [0, 1, 1, 0], {
		extrapolateRight: 'clamp',
	});

	return (
		<div
			style={{
				position: 'absolute',
				top: 60,
				left: 80,
				color: COLOR_ACCENT,
				fontSize: 28,
				fontWeight: 700,
				letterSpacing: 4,
				opacity,
			}}
		>
			{label}
		</div>
	);
};

const SegmentPlaceholder: React.FC<{name: string}> = ({name}) => {
	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				fontSize: 96,
				color: COLOR_TEXT,
				fontWeight: 700,
			}}
		>
			[ {name} content here ]
		</div>
	);
};

export const MyAnimation = () => {
	let cursor = 0;
	return (
		<AbsoluteFill style={{backgroundColor: COLOR_BG}}>
			{SEGMENTS.map((seg) => {
				const from = cursor;
				const durationInFrames = seg.seconds * FPS;
				cursor += durationInFrames;
				return (
					<Sequence
						key={seg.name}
						from={from}
						durationInFrames={durationInFrames}
						name={seg.name}
					>
						<AbsoluteFill>
							<SegmentLabel label={seg.label} />
							<SegmentPlaceholder name={seg.name} />
						</AbsoluteFill>
					</Sequence>
				);
			})}
		</AbsoluteFill>
	);
};
