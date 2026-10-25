import { ChatOpenAI } from '@langchain/openai';
import {
	getConnectionHintNoticeField,
	getProxyAgent,
	N8nLlmTracing,
} from '@n8n/ai-utilities';
import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	buildPlugins,
	buildProviderPreferences,
	buildReasoning,
	csvToArray,
	loadOptions,
} from '../OpenRouter/GenericFunctions';
import {
	pluginsField,
	providerRoutingField,
	reasoningField,
} from '../OpenRouter/descriptions/SharedFields';

interface OpenAIStyleResponse {
	choices: Array<{
		message?: {
			tool_calls?: Array<{ function?: { arguments?: unknown } }>;
		};
	}>;
}

function isOpenAIResponseWithChoices(json: unknown): json is OpenAIStyleResponse {
	return (
		typeof json === 'object' &&
		json !== null &&
		'choices' in json &&
		Array.isArray((json as OpenAIStyleResponse).choices)
	);
}

/**
 * Some OpenRouter providers return tool-call arguments as an object, or blank,
 * where the OpenAI schema requires a JSON string. LangChain throws on those, so
 * repair them in-flight. Mirrors the fix in n8n's own OpenRouter node.
 */
function createOpenRouterFetch(baseFetch: typeof globalThis.fetch): typeof globalThis.fetch {
	return async (input: any, init?: any) => {
		const response = await baseFetch(input, init);
		const contentType = response.headers.get('content-type') ?? '';
		if (!contentType.includes('json')) return response;

		const clone = response.clone();
		const json = await response.json();
		if (!isOpenAIResponseWithChoices(json)) return clone;

		const isInvalidArgs = (args: unknown) => typeof args !== 'string' || !args.trim();
		const toolCallsToFix = json.choices
			.flatMap((choice) => choice.message?.tool_calls ?? [])
			.filter((toolCall) => toolCall.function && isInvalidArgs(toolCall.function.arguments));

		if (toolCallsToFix.length === 0) return clone;

		for (const toolCall of toolCallsToFix) {
			if (!toolCall.function) continue;
			const args = toolCall.function.arguments;
			const isPlainObject = typeof args === 'object' && args !== null && !Array.isArray(args);
			toolCall.function.arguments = isPlainObject ? JSON.stringify(args) : '{}';
		}

		return new Response(JSON.stringify(json), {
			status: response.status,
			statusText: response.statusText,
			headers: { 'content-type': contentType },
		});
	};
}

export class OpenRouterChatModelAdvanced implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenRouter Chat Model (Advanced)',
		name: 'openRouterChatModelAdvanced',
		icon: { light: 'file:openrouter.svg', dark: 'file:openrouter.dark.svg' },
		group: ['transform'],
		version: 1,
		description:
			'OpenRouter chat model with provider routing, plugins and reasoning control, for AI chains and agents',
		defaults: {
			name: 'OpenRouter Chat Model (Advanced)',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://openrouter.ai/docs/api_reference/overview',
					},
				],
			},
		},
		// This is an AI sub-node, not a regular node: it takes no main input and
		// supplies a language model. The lint rules below assume a regular node.
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'openRouterApi',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Model Name or ID',
				name: 'model',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getModels',
				},
				default: 'openai/gpt-4.1-mini',
				description:
					'Model to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Fallback Models',
				name: 'fallbackModels',
				type: 'string',
				default: '',
				placeholder: 'anthropic/claude-sonnet-4, openai/gpt-5.2',
				description: 'Comma-separated models to try in order if the primary model fails or is unavailable',
			},
			providerRoutingField,
			pluginsField,
			reasoningField,
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Frequency Penalty',
						name: 'frequencyPenalty',
						type: 'number',
						typeOptions: { minValue: -2, maxValue: 2, numberPrecision: 1 },
						default: 0,
						description: 'Penalise tokens by how often they have appeared so far, from -2 to 2',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						type: 'number',
						default: 2,
						description: 'How many times to retry a failed request',
					},
					{
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokens',
						type: 'number',
						default: -1,
						description: 'Upper bound on tokens generated. -1 leaves it to the model default.',
					},
					{
						displayName: 'Presence Penalty',
						name: 'presencePenalty',
						type: 'number',
						typeOptions: { minValue: -2, maxValue: 2, numberPrecision: 1 },
						default: 0,
						description: 'Penalise tokens that have appeared at all, from -2 to 2',
					},
					{
						displayName: 'Response Format',
						name: 'responseFormat',
						type: 'options',
						default: 'text',
						description: 'Shape of the response the model must produce',
						options: [
							{ name: 'JSON', value: 'json_object', description: 'Guaranteed valid JSON' },
							{ name: 'Text', value: 'text', description: 'Regular text response' },
						],
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						type: 'number',
						typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 1 },
						default: 0.7,
						description: 'Randomness of the output, from 0 to 2. Lower is more focused.',
					},
					{
						displayName: 'Service Tier',
						name: 'serviceTier',
						type: 'options',
						default: 'auto',
						description: 'Processing tier to request. Faster tiers may cost more.',
						options: [
							{ name: 'Auto', value: 'auto' },
							{ name: 'Default', value: 'default' },
							{ name: 'Fast', value: 'fast' },
							{ name: 'Flex', value: 'flex' },
							{ name: 'Priority', value: 'priority' },
							{ name: 'Scale', value: 'scale' },
						],
					},
					{
						displayName: 'Session ID',
						name: 'sessionId',
						type: 'string',
						default: '',
						description: 'Groups related requests together, for example one agent run',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						default: 360000,
						description: 'Maximum time a request may take, in milliseconds',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 1 },
						default: 1,
						description: 'Nucleus sampling cutoff, from 0 to 1',
					},
				],
			},
		],
	};

	methods = {
		loadOptions,
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('openRouterApi');
		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

		// OpenRouter-specific fields the OpenAI client does not know about travel
		// through modelKwargs, which is passed straight into the request body.
		const modelKwargs: IDataObject = {};

		const provider = buildProviderPreferences(
			this.getNodeParameter('providerRouting', itemIndex, {}) as IDataObject,
		);
		if (provider) modelKwargs.provider = provider;

		const plugins = buildPlugins(this.getNodeParameter('plugins', itemIndex, {}) as IDataObject);
		if (plugins) modelKwargs.plugins = plugins;

		const reasoning = buildReasoning(
			this.getNodeParameter('reasoning', itemIndex, {}) as IDataObject,
		);
		if (reasoning) modelKwargs.reasoning = reasoning;

		const fallbacks = csvToArray(
			this.getNodeParameter('fallbackModels', itemIndex, '') as string,
		);
		if (fallbacks.length) modelKwargs.models = fallbacks;

		if (options.sessionId) modelKwargs.session_id = options.sessionId;
		if (options.serviceTier && options.serviceTier !== 'auto') {
			modelKwargs.service_tier = options.serviceTier;
		}
		if (options.responseFormat && options.responseFormat !== 'text') {
			modelKwargs.response_format = { type: options.responseFormat };
		}

		const timeout = (options.timeout as number) ?? 360000;
		const maxTokens = options.maxTokens as number | undefined;

		const model = new ChatOpenAI({
			apiKey: credentials.apiKey as string,
			model: modelName,
			temperature: options.temperature as number | undefined,
			topP: options.topP as number | undefined,
			frequencyPenalty: options.frequencyPenalty as number | undefined,
			presencePenalty: options.presencePenalty as number | undefined,
			maxTokens: maxTokens !== undefined && maxTokens > 0 ? maxTokens : undefined,
			timeout,
			maxRetries: (options.maxRetries as number) ?? 2,
			configuration: {
				baseURL: credentials.url as string,
				fetch: createOpenRouterFetch(globalThis.fetch),
				fetchOptions: {
					dispatcher: getProxyAgent(credentials.url as string, {
						headersTimeout: timeout,
						bodyTimeout: timeout,
					}),
				},
			},
			callbacks: [new N8nLlmTracing(this)],
			modelKwargs: Object.keys(modelKwargs).length ? modelKwargs : undefined,
		});

		return {
			response: model,
		};
	}
}
