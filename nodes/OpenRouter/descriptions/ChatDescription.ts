import type { INodeProperties } from 'n8n-workflow';

import {
	attachmentsField,
	attributionField,
	fallbackModelsField,
	generationOptionsField,
	pluginsField,
	providerRoutingField,
	reasoningField,
	responseFormatDetailFields,
	responseFormatField,
	toolsFields,
	withDisplay,
} from './SharedFields';

export const chatOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['chat'],
			},
		},
		options: [
			{
				name: 'Complete',
				value: 'complete',
				description: 'Send messages and get a completion back',
				action: 'Create a chat completion',
			},
		],
		default: 'complete',
	},
];

export const chatFields: INodeProperties[] = withDisplay(
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
			description: 'How to supply the conversation',
			options: [
				{
					name: 'Simple',
					value: 'simple',
					description: 'A single prompt with an optional system message',
				},
				{
					name: 'Messages',
					value: 'messages',
					description: 'A full messages array, for multi-turn or multimodal input',
				},
			],
		},
		{
			displayName: 'System Message',
			name: 'systemMessage',
			type: 'string',
			typeOptions: { rows: 2 },
			default: '',
			description: 'Instructions that frame how the model should behave',
			displayOptions: {
				show: {
					inputMode: ['simple'],
				},
			},
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
			default:
				'[\n  {\n    "role": "user",\n    "content": "Hello"\n  }\n]',
			required: true,
			description:
				'The full messages array. Supports text, images and files as content parts.',
			displayOptions: {
				show: {
					inputMode: ['messages'],
				},
			},
		},
		attachmentsField,
		fallbackModelsField,
		responseFormatField,
		...responseFormatDetailFields,
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
			description: 'Whether to return just the message content and usage instead of the full API response',
		},
	],
	['chat'],
	['complete'],
);
