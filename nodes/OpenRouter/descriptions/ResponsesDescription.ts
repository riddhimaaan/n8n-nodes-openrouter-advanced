import type { INodeProperties } from 'n8n-workflow';

import {
	attachmentsField,
	attributionField,
	fallbackModelsField,
	generationOptionsField,
	pluginsField,
	providerRoutingField,
	reasoningField,
	toolsFields,
	withDisplay,
} from './SharedFields';

export const responseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['response'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: "Create a response using OpenAI's Responses API format",
				action: 'Create a response',
			},
		],
		default: 'create',
	},
];

export const responseFields: INodeProperties[] = withDisplay(
	[
		{
			displayName: 'Model Name or ID',
			name: 'model',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getModels',
			},
			default: 'openai/gpt-4.1-mini',
			required: true,
			description:
				'Model to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		},
		{
			displayName: 'Input Mode',
			name: 'inputMode',
			type: 'options',
			default: 'simple',
			description: 'How to supply the input',
			options: [
				{ name: 'Simple', value: 'simple', description: 'A single block of text' },
				{
					name: 'Items',
					value: 'items',
					description: 'A structured input array, for multi-turn or multimodal input',
				},
			],
		},
		{
			displayName: 'Instructions',
			name: 'instructions',
			type: 'string',
			typeOptions: { rows: 2 },
			default: '',
			description: 'System-level instructions that frame how the model should behave',
		},
		{
			displayName: 'Input',
			name: 'input',
			type: 'string',
			typeOptions: { rows: 4 },
			default: '',
			required: true,
			description: 'The text to send to the model',
			displayOptions: {
				show: {
					inputMode: ['simple'],
				},
			},
		},
		{
			displayName: 'Input Items',
			name: 'inputItems',
			type: 'json',
			default: '[]',
			required: true,
			description: 'The structured input array',
			displayOptions: {
				show: {
					inputMode: ['items'],
				},
			},
		},
		{
			displayName: 'Max Output Tokens',
			name: 'maxOutputTokens',
			type: 'number',
			default: 0,
			description: 'Upper bound on tokens generated. 0 leaves it to the model default.',
		},
		attachmentsField,
		fallbackModelsField,
		...toolsFields,
		providerRoutingField,
		pluginsField,
		reasoningField,
		generationOptionsField,
		attributionField,
		{
			displayName: 'Simplify Output',
			name: 'simplify',
			type: 'boolean',
			default: false,
			description: 'Whether to return just the output text and usage instead of the full API response',
		},
	],
	['response'],
	['create'],
);
