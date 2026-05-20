import {
	AbsoluteFill,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

const COLOR_BG = '#0F172A';
const COLOR_TEXT = '#F1F5F9';
const COLOR_CORRECT = '#10B981';
const COLOR_WRONG = '#9CA3AF';
const FONT_SIZE_STEM = 56;
const FONT_SIZE_CHOICE = 48;

const STEM = 'If 2x + 6 = 14, what is the value of x?';
const CHOICES = [
	{id: 'A', text: '2'},
	{id: 'B', text: '3'},
	{id: 'C', text: '4'},
	{id: 'D', text: '5'},
];
const CORRECT_ID = 'C';

// Timeline (30 fps)
const STEM_FADE_END = 15;
const FIRST_CHOICE_AT = 15;
const CHOICE_STAGGER = 15;
const THINK_PAUSE_END = 255; // 6s think pause after last choice
const REVEAL_AT = 255;
const DISTRACTOR_AT = 285;

// Ideal composition size: 1920x1080

const Choice: React.FC<{
	id: string;
	text: string;
	index: number;
}> = ({id, text, index}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const appearStart = FIRST_CHOICE_AT + index * CHOICE_STAGGER;
	const fadeIn = interpolate(frame, [appearStart, appearStart + 15], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const isCorrect = id === CORRECT_ID;
	const isRevealed = frame >= REVEAL_AT;
	const isDimmed = frame >= DISTRACTOR_AT && !isCorrect;

	const pop = isRevealed && isCorrect
		? spring({
				frame: frame - REVEAL_AT,
				fps,
				config: {damping: 10, stiffness: 200},
			})
		: 0;
	const scale = 1 + pop * 0.12;

	const color = isRevealed
		? isCorrect
			? COLOR_CORRECT
			: COLOR_WRONG
		: COLOR_TEXT;

	return (
		<div
			style={{
				opacity: isDimmed ? 0.3 : fadeIn,
				transform: `scale(${scale})`,
				color,
				textDecoration: isDimmed ? 'line-through' : 'none',
				fontSize: FONT_SIZE_CHOICE,
				marginBottom: 20,
				transition: 'none',
			}}
		>
			<strong style={{marginRight: 16}}>{id}.</strong>
			{text}
		</div>
	);
};

export const MyAnimation = () => {
	const frame = useCurrentFrame();
	const stemOpacity = interpolate(frame, [0, STEM_FADE_END], [0, 1], {
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill
			style={{
				backgroundColor: COLOR_BG,
				color: COLOR_TEXT,
				padding: 120,
				fontFamily: 'sans-serif',
				justifyContent: 'center',
			}}
		>
			<div
				style={{
					opacity: stemOpacity,
					fontSize: FONT_SIZE_STEM,
					fontWeight: 700,
					marginBottom: 64,
				}}
			>
				{STEM}
			</div>
			<div>
				{CHOICES.map((c, i) => (
					<Choice key={c.id} id={c.id} text={c.text} index={i} />
				))}
			</div>
		</AbsoluteFill>
	);
};
