import type { INodeProperties } from 'n8n-workflow';

import { providerRoutingField, withDisplay } from './SharedFields';

export const audioOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['audio'],
			},
		},
		options: [
			{
				name: 'Text to Speech',
				value: 'textToSpeech',
				description: 'Synthesise speech from text',
				action: 'Generate speech',
			},
			{
				name: 'Transcribe',
				value: 'transcribe',
				description: 'Transcribe an audio file to text',
				action: 'Transcribe audio',
			},
		],
		default: 'textToSpeech',
	},
];

export const audioFields: INodeProperties[] = [
	...withDisplay(
		[
			{
				displayName: 'Model',
				name: 'model',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'openai/gpt-4o-mini-tts',
				description: 'The text-to-speech model to use',
			},
			{
				displayName: 'Text',
				name: 'input',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				required: true,
				description: 'The text to speak',
			},
			{
				displayName: 'Put Output in Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary field to write the audio to',
			},
			providerRoutingField,
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Response Format',
						name: 'response_format',
						type: 'options',
						default: 'mp3',
						description: 'Audio encoding to return',
						options: [
							{ name: 'MP3', value: 'mp3' },
							{ name: 'PCM', value: 'pcm' },
						],
					},
					{
						displayName: 'Speed',
						name: 'speed',
						type: 'number',
						typeOptions: { numberPrecision: 2 },
						default: 1,
						description: 'Playback speed multiplier, on models that support it',
					},
					{
						displayName: 'Voice',
						name: 'voice',
						type: 'string',
						default: '',
						placeholder: 'alloy',
						description: 'Voice identifier. Values are provider-specific.',
					},
				],
			},
		],
		['audio'],
		['textToSpeech'],
	),
	...withDisplay(
		[
			{
				displayName: 'Model',
				name: 'model',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'openai/whisper-1',
				description: 'The speech-to-text model to use',
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary field holding the audio to transcribe',
			},
			providerRoutingField,
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Language',
						name: 'language',
						type: 'string',
						default: '',
						placeholder: 'en',
						description: 'ISO-639-1 language code. Detected automatically if left empty.',
					},
					{
						displayName: 'Response Format',
						name: 'response_format',
						type: 'options',
						default: 'json',
						description: 'How much detail to return',
						options: [
							{ name: 'JSON', value: 'json', description: 'Just the text and usage' },
							{
								name: 'Verbose JSON',
								value: 'verbose_json',
								description: 'Adds segments and timestamps',
							},
						],
					},
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
						default: 0,
						description: 'Sampling temperature for transcription',
					},
					{
						displayName: 'Timestamp Granularities',
						name: 'timestamp_granularities',
						type: 'multiOptions',
						default: [],
						description: 'Timestamp detail to include. Needs the Verbose JSON format.',
						options: [
							{ name: 'Segment', value: 'segment' },
							{ name: 'Word', value: 'word' },
						],
					},
				],
			},
		],
		['audio'],
		['transcribe'],
	),
];
