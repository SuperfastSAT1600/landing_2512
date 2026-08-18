import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';

const COLOR_BG = '#0D1117';
const COLOR_TEXT = '#E6EDF3';
const COLOR_HIGHLIGHT_BG = 'rgba(255, 230, 109, 0.18)';
const COLOR_KEYWORD = '#FF7B72';
const COLOR_STRING = '#A5D6FF';
const COLOR_FN = '#D2A8FF';
const COLOR_COMMENT = '#8B949E';
const FONT_SIZE = 36;
const LINE_HEIGHT = 1.6;
const LINE_REVEAL_FRAMES = 24;
const HIGHLIGHT_DURATION = 60;

// Ideal composition size: 1920x1080
// Lightweight code reveal that animates line-by-line and pulses a highlight.
// For production-grade syntax colors use Shiki in calculateMetadata (see
// rules/code-highlighting.md). This example uses inline token spans so the
// asset is self-contained.

type Token = {text: string; color?: string};
type Line = {tokens: Token[]; highlight?: boolean};

const LINES: Line[] = [
	{
		tokens: [
			{text: 'function', color: COLOR_KEYWORD},
			{text: ' '},
			{text: 'isPrime', color: COLOR_FN},
			{text: '(n) {'},
		],
	},
	{
		tokens: [
			{text: '  '},
			{text: '// 1 is not prime', color: COLOR_COMMENT},
		],
	},
	{
		tokens: [
			{text: '  '},
			{text: 'if', color: COLOR_KEYWORD},
			{text: ' (n < 2) '},
			{text: 'return', color: COLOR_KEYWORD},
			{text: ' '},
			{text: 'false', color: COLOR_STRING},
			{text: ';'},
		],
		highlight: true,
	},
	{
		tokens: [
			{text: '  '},
			{text: 'for', color: COLOR_KEYWORD},
			{text: ' (let i = 2; i * i <= n; i++) {'},
		],
	},
	{
		tokens: [
			{text: '    '},
			{text: 'if', color: COLOR_KEYWORD},
			{text: ' (n % i === 0) '},
			{text: 'return', color: COLOR_KEYWORD},
			{text: ' '},
			{text: 'false', color: COLOR_STRING},
			{text: ';'},
		],
	},
	{tokens: [{text: '  }'}]},
	{
		tokens: [
			{text: '  '},
			{text: 'return', color: COLOR_KEYWORD},
			{text: ' '},
			{text: 'true', color: COLOR_STRING},
			{text: ';'},
		],
	},
	{tokens: [{text: '}'}]},
];

const HIGHLIGHT_INDEX = LINES.findIndex((l) => l.highlight);
const HIGHLIGHT_AT = (HIGHLIGHT_INDEX + 1) * LINE_REVEAL_FRAMES + 6;

const CodeLine: React.FC<{line: Line; index: number}> = ({line, index}) => {
	const frame = useCurrentFrame();
	const lineAppear = index * LINE_REVEAL_FRAMES;
	const opacity = interpolate(
		frame,
		[lineAppear, lineAppear + 12],
		[0, 1],
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
	);
	const x = interpolate(frame, [lineAppear, lineAppear + 12], [-12, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const highlightOpacity = line.highlight
		? interpolate(
				frame,
				[HIGHLIGHT_AT, HIGHLIGHT_AT + 10, HIGHLIGHT_AT + HIGHLIGHT_DURATION],
				[0, 1, 1],
				{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
			)
		: 0;

	return (
		<div
			style={{
				opacity,
				transform: `translateX(${x}px)`,
				background: line.highlight
					? `rgba(255, 230, 109, ${0.18 * highlightOpacity})`
					: 'transparent',
				padding: '2px 16px',
				borderRadius: 6,
			}}
		>
			{line.tokens.map((tok, i) => (
				<span key={i} style={{color: tok.color ?? COLOR_TEXT}}>
					{tok.text}
				</span>
			))}
		</div>
	);
};

export const MyAnimation = () => {
	return (
		<AbsoluteFill
			style={{
				backgroundColor: COLOR_BG,
				color: COLOR_TEXT,
				fontFamily: '"Fira Code", "JetBrains Mono", monospace',
				fontSize: FONT_SIZE,
				lineHeight: LINE_HEIGHT,
				padding: 80,
				justifyContent: 'center',
			}}
		>
			<div>
				{LINES.map((line, i) => (
					<Sequence key={i} from={0} layout="none">
						<CodeLine line={line} index={i} />
					</Sequence>
				))}
			</div>
		</AbsoluteFill>
	);
};
