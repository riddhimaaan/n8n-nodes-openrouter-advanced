import type { INodeProperties } from 'n8n-workflow';

import { providerRoutingField, withDisplay } from './SharedFields';

export const embeddingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['embedding'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Turn text into an embedding vector',
				action: 'Create an embedding',
			},
			{
				name: 'List Models',
				value: 'listModels',
				description: 'List the available embedding models',
				action: 'List embedding models',
			},
		],
		default: 'create',
	},
];

export const embeddingFields: INodeProperties[] = withDisplay(
	[
		{
			displayName: 'Model Name or ID',
			name: 'model',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getEmbeddingModels',
			},
			default: '',
			required: true,
			description:
				'Embedding model to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		},
		{
			displayName: 'Input',
			name: 'input',
			type: 'string',
			typeOptions: { rows: 3 },
			default: '',
			required: true,
			description:
				'Text to embed. Separate multiple inputs with newlines to embed them in one call.',
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
					displayName: 'Dimensions',
					name: 'dimensions',
					type: 'number',
					default: 0,
					description: 'Size of the output vector. 0 uses the model default.',
				},
				{
					displayName: 'Encoding Format',
					name: 'encoding_format',
					type: 'options',
					default: 'float',
					description: 'How the vector is encoded in the response',
					options: [
						{ name: 'Base64', value: 'base64' },
						{ name: 'Float', value: 'float' },
					],
				},
				{
					displayName: 'Input Type',
					name: 'input_type',
					type: 'string',
					default: '',
					placeholder: 'search_query',
					description: 'What the text will be used for, for example search_query or search_document',
				},
				{
					displayName: 'User',
					name: 'user',
					type: 'string',
					default: '',
					description: 'Stable per-end-user identifier used for abuse isolation',
				},
			],
		},
	],
	['embedding'],
	['create'],
);
