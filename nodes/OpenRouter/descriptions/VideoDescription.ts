import type { INodeProperties } from 'n8n-workflow';

import { providerRoutingField, withDisplay } from './SharedFields';

export const videoOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['video'],
			},
		},
		options: [
			{
				name: 'Download',
				value: 'download',
				description: 'Download the finished video',
				action: 'Download a video',
			},
			{
				name: 'Generate',
				value: 'generate',
				description: 'Submit a video generation job and return immediately',
				action: 'Generate a video',
			},
			{
				name: 'Generate and Wait',
				value: 'generateAndWait',
				description: 'Submit a job, poll until it finishes, then download the video',
				action: 'Generate a video and wait',
			},
			{
				name: 'Get Status',
				value: 'get',
				description: 'Check the status of a generation job',
				action: 'Get video status',
			},
			{
				name: 'List Models',
				value: 'listModels',
				description: 'List the available video generation models',
				action: 'List video models',
			},
		],
		default: 'generateAndWait',
	},
];

const generationFields: INodeProperties[] = [
	{
		displayName: 'Model Name or ID',
		name: 'model',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getVideoModels',
		},
		default: '',
		required: true,
		description:
			'Video model to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		description: 'Description of the video you want. Optional on image-to-video models.',
	},
	{
		displayName: 'Reference Images',
		name: 'inputReferences',
		type: 'string',
		default: '',
		placeholder: 'data',
		description: 'Comma-separated binary field names to guide generation, for example a first frame',
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
				displayName: 'Aspect Ratio',
				name: 'aspect_ratio',
				type: 'options',
				default: '16:9',
				description: 'Shape of the generated video',
				options: [
					{ name: '1:1', value: '1:1' },
					{ name: '3:2', value: '3:2' },
					{ name: '3:4', value: '3:4' },
					{ name: '4:3', value: '4:3' },
					{ name: '9:16', value: '9:16' },
					{ name: '16:9', value: '16:9' },
				],
			},
			{
				displayName: 'Callback URL',
				name: 'callback_url',
				type: 'string',
				default: '',
				description: 'Webhook to notify when generation finishes',
			},
			{
				displayName: 'Duration',
				name: 'duration',
				type: 'number',
				default: 0,
				description: 'Length of the video in seconds. 0 leaves it to the model default.',
			},
			{
				displayName: 'Generate Audio',
				name: 'generate_audio',
				type: 'boolean',
				default: true,
				description: 'Whether to generate a soundtrack alongside the video',
			},
			{
				displayName: 'Resolution',
				name: 'resolution',
				type: 'options',
				default: '720p',
				description: 'Resolution of the generated video',
				options: [
					{ name: '480p', value: '480p' },
					{ name: '720p', value: '720p' },
					{ name: '768p', value: '768p' },
					{ name: '1080p', value: '1080p' },
					{ name: '1K', value: '1K' },
					{ name: '2K', value: '2K' },
				],
			},
			{
				displayName: 'Seed',
				name: 'seed',
				type: 'number',
				default: 0,
				description: 'Fixed seed for reproducible output. 0 leaves it unset.',
			},
			{
				displayName: 'Size',
				name: 'size',
				type: 'string',
				default: '',
				placeholder: '1920x1080',
				description: 'Exact pixel dimensions. Overrides aspect ratio and resolution.',
			},
		],
	},
];

export const videoFields: INodeProperties[] = [
	...withDisplay(generationFields, ['video'], ['generate']),
	...withDisplay(
		[
			...generationFields,
			{
				displayName: 'Put Output in Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary field to write the finished video to',
			},
			{
				displayName: 'Poll Interval (Seconds)',
				name: 'pollInterval',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 10,
				description: 'How long to wait between status checks',
			},
			{
				displayName: 'Timeout (Minutes)',
				name: 'pollTimeout',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 15,
				description: 'Give up after this long and fail the item',
			},
		],
		['video'],
		['generateAndWait'],
	),
	...withDisplay(
		[
			{
				displayName: 'Job ID',
				name: 'jobId',
				type: 'string',
				default: '',
				required: true,
				description: 'The generation job to check',
			},
		],
		['video'],
		['get'],
	),
	...withDisplay(
		[
			{
				displayName: 'Job ID',
				name: 'jobId',
				type: 'string',
				default: '',
				required: true,
				description: 'The finished generation job to download',
			},
			{
				displayName: 'Put Output in Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary field to write the video to',
			},
		],
		['video'],
		['download'],
	),
];
