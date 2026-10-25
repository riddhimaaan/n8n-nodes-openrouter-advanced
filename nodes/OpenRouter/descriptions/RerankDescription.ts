import type { INodeProperties } from 'n8n-workflow';

import { providerRoutingField, withDisplay } from './SharedFields';

export const rerankOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['rerank'],
			},
		},
		options: [
			{
				name: 'Rerank',
				value: 'rerank',
				description: 'Reorder documents by how well they answer a query',
				action: 'Rerank documents',
			},
		],
		default: 'rerank',
	},
];

export const rerankFields: INodeProperties[] = withDisplay(
	[
		{
			displayName: 'Model',
			name: 'model',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'cohere/rerank-v3.5',
			description: 'The rerank model to use',
		},
		{
			displayName: 'Query',
			name: 'query',
			type: 'string',
			default: '',
			required: true,
			description: 'The search query to rank the documents against',
		},
		{
			displayName: 'Documents Source',
			name: 'documentsSource',
			type: 'options',
			default: 'text',
			description: 'How to supply the documents',
			options: [
				{ name: 'Text', value: 'text', description: 'One document per line' },
				{ name: 'JSON', value: 'json', description: 'A JSON array of strings or objects' },
			],
		},
		{
			displayName: 'Documents',
			name: 'documentsText',
			type: 'string',
			typeOptions: { rows: 5 },
			default: '',
			required: true,
			description: 'The documents to rerank, one per line',
			displayOptions: {
				show: {
					documentsSource: ['text'],
				},
			},
		},
		{
			displayName: 'Documents (JSON)',
			name: 'documentsJson',
			type: 'json',
			default: '[]',
			required: true,
			description: 'The documents to rerank, as a JSON array',
			displayOptions: {
				show: {
					documentsSource: ['json'],
				},
			},
		},
		{
			displayName: 'Top N',
			name: 'topN',
			type: 'number',
			default: 0,
			description: 'How many of the best matches to return. 0 returns all of them.',
		},
		providerRoutingField,
	],
	['rerank'],
	['rerank'],
);
