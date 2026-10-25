import type { INodeProperties } from 'n8n-workflow';

import {
	attributionField,
	fallbackModelsField,
	pluginsField,
	providerRoutingField,
	toolsFields,
	withDisplay,
} from './SharedFields';

export const messageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['message'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: "Create a message using Anthropic's Messages API format",
				action: 'Create a message',
			},
		],
		default: 'create',
	},
];

export const messageFields: INodeProperties[] = withDisplay(
	[
		{
			displayName: 'Model Name or ID',
			name: 'model',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getModels',
			},
			default: 'anthropic/claude-sonnet-4',
			required: true,
			description:
				'Model to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		},
		{
			displayName: 'Max Tokens',
			name: 'maxTokens',
			type: 'number',
			default: 1024,
			required: true,
			description: 'Maximum tokens to generate. Required by the Messages API.',
		},
		{
			displayName: 'Input Mode',
			name: 'inputMode',
			type: 'options',
			default: 'simple',
			description: 'How to supply the conversation',
			options: [
				{ name: 'Simple', value: 'simple', description: 'A single prompt' },
				{ name: 'Messages', value: 'messages', description: 'A full messages array' },
			],
		},
		{
			displayName: 'System',
			name: 'system',
			type: 'string',
			typeOptions: { rows: 2 },
			default: '',
			description: 'System prompt that frames how the model should behave',
		},
		{
			displayName: 'Prompt',
			name: 'prompt',
			type: 'string',
			typeOptions: { rows: 4 },
			default: '',
			required: true,
			description: 'The message to send to the model',
			displayOptions: {
				show: {
					inputMode: ['simple'],
				},
			},
		},
		{
			displayName: 'Messages',
			name: 'messages',
			type: 'json',
			default: '[\n  {\n    "role": "user",\n    "content": "Hello"\n  }\n]',
			required: true,
			description: 'The full messages array in Anthropic format',
			displayOptions: {
				show: {
					inputMode: ['messages'],
				},
			},
		},
		{
			displayName: 'Thinking',
			name: 'thinking',
			type: 'collection',
			placeholder: 'Add Thinking Option',
			default: {},
			description: 'Extended thinking configuration, on models that support it',
			options: [
				{
					displayName: 'Enabled',
					name: 'enabled',
					type: 'boolean',
					default: true,
					description: 'Whether to enable extended thinking',
				},
				{
					displayName: 'Budget Tokens',
					name: 'budget_tokens',
					type: 'number',
					default: 1024,
					description: 'Token budget the model may spend on thinking',
				},
			],
		},
		fallbackModelsField,
		...toolsFields,
		providerRoutingField,
		pluginsField,
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			options: [
				{
					displayName: 'Session ID',
					name: 'session_id',
					type: 'string',
					default: '',
					description: 'Groups related requests together, for example one conversation',
				},
				{
					displayName: 'Stop Sequences',
					name: 'stop_sequences',
					type: 'string',
					default: '',
					description: 'Comma-separated strings that halt generation',
				},
				{
					displayName: 'Temperature',
					name: 'temperature',
					type: 'number',
					typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
					default: 1,
					description: 'Randomness of the output, from 0 to 1',
				},
				{
					displayName: 'Top K',
					name: 'top_k',
					type: 'number',
					default: 0,
					description: 'Only sample from the K most likely tokens. 0 disables it.',
				},
				{
					displayName: 'Top P',
					name: 'top_p',
					type: 'number',
					typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 3 },
					default: 1,
					description: 'Nucleus sampling cutoff, from 0 to 1',
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
		attributionField,
		{
			displayName: 'Simplify Output',
			name: 'simplify',
			type: 'boolean',
			default: false,
			description: 'Whether to return just the message text and usage instead of the full API response',
		},
	],
	['message'],
	['create'],
);
