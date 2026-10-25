import type { INodeProperties } from 'n8n-workflow';

import { withDisplay } from './SharedFields';

export const modelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['model'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get one model and its properties',
				action: 'Get a model',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all available models',
				action: 'List models',
			},
			{
				name: 'List Endpoints',
				value: 'listEndpoints',
				description: 'List the provider endpoints serving a model, with prices and limits',
				action: 'List model endpoints',
			},
			{
				name: 'List Providers',
				value: 'listProviders',
				description: 'List all providers on OpenRouter',
				action: 'List providers',
			},
		],
		default: 'list',
	},
];

const modelSlugField: INodeProperties = {
	displayName: 'Model Name or ID',
	name: 'model',
	type: 'options',
	typeOptions: {
		loadOptionsMethod: 'getModels',
	},
	default: '',
	required: true,
	description:
		'Model to look up, as author/slug. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
};

export const modelFields: INodeProperties[] = [
	...withDisplay([modelSlugField], ['model'], ['get']),
	...withDisplay([modelSlugField], ['model'], ['listEndpoints']),
	...withDisplay(
		[
			{
				displayName: 'Filter by User Preferences',
				name: 'userFiltered',
				type: 'boolean',
				default: false,
				description: 'Whether to return only models allowed by your provider preferences, privacy settings and guardrails',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Category',
						name: 'category',
						type: 'string',
						default: '',
						placeholder: 'programming',
						description: 'Only return models in this category',
					},
					{
						displayName: 'Supported Parameters',
						name: 'supported_parameters',
						type: 'string',
						default: '',
						placeholder: 'tools, reasoning',
						description: 'Comma-separated parameters the model must support',
					},
				],
			},
		],
		['model'],
		['list'],
	),
];
