import type { INodeProperties } from 'n8n-workflow';

import { providerRoutingField, withDisplay } from './SharedFields';

export const imageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
		options: [
			{
				name: 'Generate',
				value: 'generate',
				description: 'Generate an image from a text prompt',
				action: 'Generate an image',
			},
			{
				name: 'List Models',
				value: 'listModels',
				description: 'List the available image generation models',
				action: 'List image models',
			},
		],
		default: 'generate',
	},
];

export const imageFields: INodeProperties[] = [
	...withDisplay(
		[
			{
				displayName: 'Model Name or ID',
				name: 'model',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getImageModels',
				},
				default: '',
				required: true,
				description:
					'Image model to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				required: true,
				description: 'Description of the image you want',
			},
			{
				displayName: 'Put Output in Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary field to write the generated image to',
			},
			{
				displayName: 'Reference Images',
				name: 'inputReferences',
				type: 'string',
				default: '',
				placeholder: 'data',
				description:
					'Comma-separated binary field names to use as reference images for image-to-image generation. Leave empty for text-to-image.',
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
						default: '1:1',
						description: 'Shape of the generated image',
						options: [
							{ name: '1:1', value: '1:1' },
							{ name: '1:2', value: '1:2' },
							{ name: '1:4', value: '1:4' },
							{ name: '1:8', value: '1:8' },
							{ name: '2:1', value: '2:1' },
							{ name: '2:3', value: '2:3' },
							{ name: '3:2', value: '3:2' },
							{ name: '3:4', value: '3:4' },
							{ name: '4:1', value: '4:1' },
							{ name: '4:3', value: '4:3' },
							{ name: '8:1', value: '8:1' },
							{ name: '9:16', value: '9:16' },
							{ name: '16:9', value: '16:9' },
						],
					},
					{
						displayName: 'Background',
						name: 'background',
						type: 'options',
						default: 'auto',
						description: 'Background treatment. Transparent needs a PNG or WebP output format.',
						options: [
							{ name: 'Auto', value: 'auto' },
							{ name: 'Opaque', value: 'opaque' },
							{ name: 'Transparent', value: 'transparent' },
						],
					},
					{
						displayName: 'Number of Images',
						name: 'n',
						type: 'number',
						typeOptions: { minValue: 1, maxValue: 10 },
						default: 1,
						description: 'How many images to generate, from 1 to 10',
					},
					{
						displayName: 'Output Compression',
						name: 'output_compression',
						type: 'number',
						typeOptions: { minValue: 0, maxValue: 100 },
						default: 0,
						description: 'Compression level from 0 to 100 for WebP or JPEG. Ignored for PNG.',
					},
					{
						displayName: 'Output Format',
						name: 'output_format',
						type: 'options',
						default: 'png',
						description: 'Encoding of the returned image',
						options: [
							{ name: 'JPEG', value: 'jpeg' },
							{ name: 'PNG', value: 'png' },
							{ name: 'SVG', value: 'svg' },
							{ name: 'WebP', value: 'webp' },
						],
					},
					{
						displayName: 'Quality',
						name: 'quality',
						type: 'options',
						default: 'auto',
						description: 'Rendering quality, on models that support it',
						options: [
							{ name: 'Auto', value: 'auto' },
							{ name: 'High', value: 'high' },
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
						],
					},
					{
						displayName: 'Resolution',
						name: 'resolution',
						type: 'options',
						default: '1K',
						description: 'Resolution tier of the generated image',
						options: [
							{ name: '512', value: '512' },
							{ name: '1K', value: '1K' },
							{ name: '2K', value: '2K' },
							{ name: '4K', value: '4K' },
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
						placeholder: '1024x1024',
						description: 'Exact pixel dimensions. Overrides aspect ratio and resolution.',
					},
				],
			},
		],
		['image'],
		['generate'],
	),
];
