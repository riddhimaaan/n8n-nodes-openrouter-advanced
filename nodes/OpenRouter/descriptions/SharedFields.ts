import type { INodeProperties } from 'n8n-workflow';

/**
 * Option blocks shared by the text-generation resources (Chat, Response, Message).
 *
 * These are defined once here and spread into each resource description via
 * `withDisplay()`, so provider routing / plugins / reasoning behave identically
 * everywhere and only have to be maintained in one place.
 */

/** Clones properties and scopes them to the given resource + operation combination. */
export function withDisplay(
	properties: INodeProperties[],
	resource: string[],
	operation: string[],
): INodeProperties[] {
	return properties.map((property) => ({
		...property,
		displayOptions: {
			show: {
				...(property.displayOptions?.show ?? {}),
				resource,
				operation,
			},
		},
	}));
}

/**
 * Provider routing. Controls which upstream provider serves the request, in what
 * order, and under what price/latency/privacy constraints.
 */
export const providerRoutingField: INodeProperties = {
	displayName: 'Provider Routing',
	name: 'providerRouting',
	type: 'collection',
	placeholder: 'Add Routing Option',
	default: {},
	description: 'Control which upstream provider serves this request',
	options: [
		{
			displayName: 'Allow Fallbacks',
			name: 'allow_fallbacks',
			type: 'boolean',
			default: true,
			description:
				'Whether to fall back to other providers when the preferred ones are unavailable. Turn off to fail instead.',
		},
		{
			displayName: 'Data Collection',
			name: 'data_collection',
			type: 'options',
			default: 'allow',
			description:
				'Whether to permit providers that may store or train on your data. "Deny" restricts routing to providers that do not.',
			options: [
				{
					name: 'Allow',
					value: 'allow',
					description: 'Allow providers that may store data non-transiently',
				},
				{
					name: 'Deny',
					value: 'deny',
					description: 'Use only providers that do not collect user data',
				},
			],
		},
		{
			displayName: 'Enforce Distillable Text',
			name: 'enforce_distillable_text',
			type: 'boolean',
			default: false,
			description: 'Whether to route only to models whose output may be used for distillation',
		},
		{
			displayName: 'Ignore Provider Names or IDs',
			name: 'ignore',
			type: 'multiOptions',
			typeOptions: {
				loadOptionsMethod: 'getProviders',
			},
			default: [],
			description: 'Providers to exclude. Merged with your account-wide ignore list. Choose from the list or specify IDs using an expression. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		},
		{
			displayName: 'Max Price',
			name: 'max_price',
			type: 'collection',
			placeholder: 'Add Price Limit',
			default: {},
			description:
				'Reject the request rather than exceed these prices. Token prices are USD per million tokens.',
			options: [
				{
					displayName: 'Max Completion Price',
					name: 'completion',
					type: 'number',
					default: 0,
					description: 'Maximum USD per million completion tokens',
				},
				{
					displayName: 'Max Image Price',
					name: 'image',
					type: 'number',
					default: 0,
					description: 'Maximum USD per image',
				},
				{
					displayName: 'Max Prompt Price',
					name: 'prompt',
					type: 'number',
					default: 0,
					description: 'Maximum USD per million prompt tokens',
				},
				{
					displayName: 'Max Request Price',
					name: 'request',
					type: 'number',
					default: 0,
					description: 'Maximum USD for the request as a whole',
				},
			],
		},
		{
			displayName: 'Only Provider Names or IDs',
			name: 'only',
			type: 'multiOptions',
			typeOptions: {
				loadOptionsMethod: 'getProviders',
			},
			default: [],
			description: 'Restrict routing to these providers only. Choose from the list or specify IDs using an expression. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		},
		{
			displayName: 'Preferred Max Latency',
			name: 'preferred_max_latency',
			type: 'number',
			default: 0,
			description:
				'Preferred maximum latency in seconds (p50). Slower endpoints are deprioritised rather than excluded.',
		},
		{
			displayName: 'Preferred Min Throughput',
			name: 'preferred_min_throughput',
			type: 'number',
			default: 0,
			description:
				'Preferred minimum throughput in tokens per second (p50). Slower endpoints are deprioritised rather than excluded.',
		},
		{
			displayName: 'Provider Order Names or IDs',
			name: 'order',
			type: 'multiOptions',
			typeOptions: {
				loadOptionsMethod: 'getProviders',
			},
			default: [],
			description: 'Try these providers in order. The first one supporting the model wins. Choose from the list or specify IDs using an expression. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		},
		{
			displayName: 'Quantizations',
			name: 'quantizations',
			type: 'multiOptions',
			default: [],
			description: 'Only route to endpoints using these quantization levels',
			options: [
				{ name: 'BF16', value: 'bf16' },
				{ name: 'FP16', value: 'fp16' },
				{ name: 'FP32', value: 'fp32' },
				{ name: 'FP4', value: 'fp4' },
				{ name: 'FP6', value: 'fp6' },
				{ name: 'FP8', value: 'fp8' },
				{ name: 'Int4', value: 'int4' },
				{ name: 'Int8', value: 'int8' },
				{ name: 'MXFP4', value: 'mxfp4' },
				{ name: 'MXFP8', value: 'mxfp8' },
				{ name: 'NVFP4', value: 'nvfp4' },
				{ name: 'Unknown', value: 'unknown' },
			],
		},
		{
			displayName: 'Require Parameters',
			name: 'require_parameters',
			type: 'boolean',
			default: false,
			description:
				'Whether to route only to providers that support every parameter you sent. Prevents silent parameter dropping.',
		},
		{
			displayName: 'Sort By',
			name: 'sort',
			type: 'options',
			default: 'price',
			description:
				'Sorting strategy when no explicit provider order is set. Setting this disables load balancing.',
			options: [
				{ name: 'Exacto', value: 'exacto', description: 'Optimise for output accuracy' },
				{ name: 'Latency', value: 'latency', description: 'Fastest to first token' },
				{ name: 'Price', value: 'price', description: 'Cheapest first' },
				{ name: 'Throughput', value: 'throughput', description: 'Highest tokens per second' },
			],
		},
		{
			displayName: 'Zero Data Retention (ZDR)',
			name: 'zdr',
			type: 'boolean',
			default: false,
			description: 'Whether to restrict routing to endpoints that retain no data at all',
		},
	],
};

/**
 * OpenRouter plugins. Each entry maps to one discriminated variant of the
 * `plugins` array, keyed by its `id`.
 */
export const pluginsField: INodeProperties = {
	displayName: 'Plugins',
	name: 'plugins',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	placeholder: 'Add Plugin',
	default: {},
	description: 'Server-side capabilities to enable for this request',
	options: [
		{
			name: 'web',
			displayName: 'Web Search',
			values: [
				{
					displayName: 'Engine',
					name: 'engine',
					type: 'options',
					default: 'native',
					description: 'Which search backend to use',
					options: [
						{ name: 'Exa', value: 'exa' },
						{ name: 'Firecrawl', value: 'firecrawl' },
						{ name: 'Native', value: 'native' },
						{ name: 'Parallel', value: 'parallel' },
						{ name: 'Perplexity', value: 'perplexity' },
					],
				},
				{
					displayName: 'Max Results',
					name: 'max_results',
					type: 'number',
					default: 5,
					description: 'How many search results to pull in',
				},
				{
					displayName: 'Max Uses',
					name: 'max_uses',
					type: 'number',
					default: 0,
					description: 'Maximum searches the model may run in one turn. 0 leaves it unset.',
				},
				{
					displayName: 'Include Domains',
					name: 'include_domains',
					type: 'string',
					default: '',
					placeholder: 'example.com, *.substack.com',
					description:
						'Comma-separated domains to restrict results to. Supports wildcards and paths.',
				},
				{
					displayName: 'Exclude Domains',
					name: 'exclude_domains',
					type: 'string',
					default: '',
					placeholder: 'example.com, *.substack.com',
					description: 'Comma-separated domains to exclude. Supports wildcards and paths.',
				},
			],
		},
		{
			name: 'webFetch',
			displayName: 'Web Fetch',
			values: [
				{
					displayName: 'Max Content Tokens',
					name: 'max_content_tokens',
					type: 'number',
					default: 0,
					description: 'Truncate fetched pages to roughly this many tokens. 0 leaves it unset.',
				},
				{
					displayName: 'Max Uses',
					name: 'max_uses',
					type: 'number',
					default: 0,
					description: 'Maximum fetches per request. 0 leaves it unset.',
				},
				{
					displayName: 'Allowed Domains',
					name: 'allowed_domains',
					type: 'string',
					default: '',
					description: 'Comma-separated domains that may be fetched',
				},
				{
					displayName: 'Blocked Domains',
					name: 'blocked_domains',
					type: 'string',
					default: '',
					description: 'Comma-separated domains that must never be fetched',
				},
			],
		},
		{
			name: 'fileParser',
			displayName: 'File Parser',
			values: [
				{
					displayName: 'PDF Engine',
					name: 'pdfEngine',
					type: 'options',
					default: 'pdf-text',
					description:
						'How to extract PDF content. Text extraction is free; OCR handles scans but costs more.',
					options: [
						{ name: 'Mistral OCR', value: 'mistral-ocr' },
						{ name: 'Native', value: 'native' },
						{ name: 'PDF Text', value: 'pdf-text' },
					],
				},
			],
		},
		{
			name: 'moderation',
			displayName: 'Moderation',
			values: [
				{
					displayName: 'Notice',
					name: 'notice',
					type: 'notice',
					default: '',
					description: 'Screens prompts and responses for policy violations. No settings.',
				},
			],
		},
		{
			name: 'responseHealing',
			displayName: 'Response Healing',
			values: [
				{
					displayName: 'Notice',
					name: 'notice',
					type: 'notice',
					default: '',
					description: 'Repairs malformed structured output automatically. No settings.',
				},
			],
		},
		{
			name: 'contextCompression',
			displayName: 'Context Compression',
			values: [
				{
					displayName: 'Engine',
					name: 'engine',
					type: 'options',
					default: 'middle-out',
					description: 'How to compress prompts that exceed the context window',
					options: [{ name: 'Middle Out', value: 'middle-out' }],
				},
			],
		},
		{
			name: 'autoRouter',
			displayName: 'Auto Router',
			values: [
				{
					displayName: 'Cost Tier',
					name: 'cost_tier',
					type: 'options',
					default: 'medium',
					description: 'Balance between cost and quality when picking a model',
					options: [
						{ name: 'High', value: 'high' },
						{ name: 'Low', value: 'low' },
						{ name: 'Max', value: 'max' },
						{ name: 'Medium', value: 'medium' },
						{ name: 'XHigh', value: 'xhigh' },
					],
				},
				{
					displayName: 'Pin Model',
					name: 'pin_model',
					type: 'boolean',
					default: false,
					description: 'Whether to reuse the model chosen for the previous assistant turn, for consistency across a conversation',
				},
				{
					displayName: 'Allowed Models',
					name: 'allowed_models',
					type: 'string',
					default: '',
					placeholder: 'openai/*, anthropic/claude-*',
					description: 'Comma-separated model patterns the router may choose from',
				},
				{
					displayName: 'Excluded Models',
					name: 'excluded_models',
					type: 'string',
					default: '',
					description: 'Comma-separated model patterns the router must not choose',
				},
			],
		},
		{
			name: 'paretoRouter',
			displayName: 'Pareto Router',
			values: [
				{
					displayName: 'Max Price',
					name: 'max_price',
					type: 'number',
					default: 0,
					description: 'Maximum input price in USD per million tokens. 0 leaves it unset.',
				},
				{
					displayName: 'Min Coding Score',
					name: 'min_coding_score',
					type: 'number',
					typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
					default: 0,
					description: 'Minimum coding quality score between 0 and 1',
				},
				{
					displayName: 'Price Source',
					name: 'price_source',
					type: 'options',
					default: 'prompt',
					description: 'Which price to use as the cost axis of the Pareto frontier',
					options: [
						{ name: 'Prompt', value: 'prompt' },
						{ name: 'Weighted Average', value: 'weighted_avg' },
					],
				},
			],
		},
		{
			name: 'fusion',
			displayName: 'Fusion',
			values: [
				{
					displayName: 'Preset',
					name: 'preset',
					type: 'options',
					default: 'general-high',
					description: 'Curated panel configuration',
					options: [
						{ name: 'General Budget', value: 'general-budget' },
						{ name: 'General Fast', value: 'general-fast' },
						{ name: 'General High', value: 'general-high' },
					],
				},
				{
					displayName: 'Analyst Model',
					name: 'model',
					type: 'string',
					default: '',
					placeholder: 'openai/gpt-5.2',
					description: 'Model that analyses and synthesises the panel output',
				},
				{
					displayName: 'Analysis Models',
					name: 'analysis_models',
					type: 'string',
					default: '',
					placeholder: 'openai/gpt-5.2, anthropic/claude-sonnet-4',
					description: 'Comma-separated models to run in parallel as the expert panel',
				},
				{
					displayName: 'Max Tool Calls',
					name: 'max_tool_calls',
					type: 'number',
					default: 0,
					description: 'Maximum tool-calling steps per panelist. 0 leaves it unset.',
				},
			],
		},
	],
};

/** Reasoning controls for thinking-capable models. */
export const reasoningField: INodeProperties = {
	displayName: 'Reasoning',
	name: 'reasoning',
	type: 'collection',
	placeholder: 'Add Reasoning Option',
	default: {},
	description: 'How hard the model should think before answering, on models that support it',
	options: [
		{
			displayName: 'Effort',
			name: 'effort',
			type: 'options',
			default: 'medium',
			description: 'How much reasoning budget to spend. Higher costs more and takes longer.',
			options: [
				{ name: 'High', value: 'high' },
				{ name: 'Low', value: 'low' },
				{ name: 'Max', value: 'max' },
				{ name: 'Medium', value: 'medium' },
				{ name: 'Minimal', value: 'minimal' },
				{ name: 'None', value: 'none' },
				{ name: 'XHigh', value: 'xhigh' },
			],
		},
		{
			displayName: 'Summary',
			name: 'summary',
			type: 'options',
			default: 'auto',
			description: 'How much of the reasoning trace to return alongside the answer',
			options: [
				{ name: 'Auto', value: 'auto' },
				{ name: 'Concise', value: 'concise' },
				{ name: 'Detailed', value: 'detailed' },
			],
		},
	],
};

/** Sampling, penalties and everything else that shapes generation. */
export const generationOptionsField: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	options: [
		{
			displayName: 'Frequency Penalty',
			name: 'frequency_penalty',
			type: 'number',
			typeOptions: { minValue: -2, maxValue: 2, numberPrecision: 2 },
			default: 0,
			description: 'Penalise tokens by how often they have appeared so far, from -2 to 2',
		},
		{
			displayName: 'Log Probabilities',
			name: 'logprobs',
			type: 'boolean',
			default: false,
			description: 'Whether to return log probabilities for each output token',
		},
		{
			displayName: 'Logit Bias',
			name: 'logit_bias',
			type: 'json',
			default: '{}',
			description: 'Per-token likelihood adjustments, as a JSON object of token ID to bias',
		},
		{
			displayName: 'Max Completion Tokens',
			name: 'max_completion_tokens',
			type: 'number',
			default: 0,
			description: 'Upper bound on tokens generated. 0 leaves it to the model default.',
		},
		{
			displayName: 'Metadata',
			name: 'metadata',
			type: 'json',
			default: '{}',
			description:
				'Up to 16 key-value pairs stored with the request. Keys max 64 chars, values max 512.',
		},
		{
			displayName: 'Min P',
			name: 'min_p',
			type: 'number',
			typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 3 },
			default: 0,
			description: 'Minimum token probability relative to the most likely token',
		},
		{
			displayName: 'Modalities',
			name: 'modalities',
			type: 'multiOptions',
			default: [],
			description: 'Output types you want back. Leave empty for text only.',
			options: [
				{ name: 'Audio', value: 'audio' },
				{ name: 'Image', value: 'image' },
				{ name: 'Text', value: 'text' },
			],
		},
		{
			displayName: 'Parallel Tool Calls',
			name: 'parallel_tool_calls',
			type: 'boolean',
			default: true,
			description: 'Whether the model may request several tool calls at once',
		},
		{
			displayName: 'Presence Penalty',
			name: 'presence_penalty',
			type: 'number',
			typeOptions: { minValue: -2, maxValue: 2, numberPrecision: 2 },
			default: 0,
			description: 'Penalise tokens that have appeared at all, from -2 to 2',
		},
		{
			displayName: 'Prompt Cache Key',
			name: 'prompt_cache_key',
			type: 'string',
			default: '',
			description: 'Group requests that share a prompt prefix so caching can kick in',
		},
		{
			displayName: 'Repetition Penalty',
			name: 'repetition_penalty',
			type: 'number',
			typeOptions: { minValue: 0, numberPrecision: 2 },
			default: 1,
			description: 'Penalise repeated text. 1 disables it.',
		},
		{
			displayName: 'Seed',
			name: 'seed',
			type: 'number',
			default: 0,
			description: 'Fixed seed for reproducible output where the provider supports it',
		},
		{
			displayName: 'Service Tier',
			name: 'service_tier',
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
			name: 'session_id',
			type: 'string',
			default: '',
			description: 'Groups related requests together, for example one conversation or agent run',
		},
		{
			displayName: 'Stop Sequences',
			name: 'stop',
			type: 'string',
			default: '',
			placeholder: '\\n\\n, END',
			description: 'Comma-separated strings that halt generation. Up to 4.',
		},
		{
			displayName: 'Temperature',
			name: 'temperature',
			type: 'number',
			typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 2 },
			default: 1,
			description: 'Randomness of the output, from 0 to 2. Lower is more focused.',
		},
		{
			displayName: 'Top A',
			name: 'top_a',
			type: 'number',
			typeOptions: { minValue: 0, numberPrecision: 3 },
			default: 0,
			description: 'Dynamic filter based on the top token probability',
		},
		{
			displayName: 'Top K',
			name: 'top_k',
			type: 'number',
			default: 0,
			description: 'Only sample from the K most likely tokens. 0 disables it.',
		},
		{
			displayName: 'Top Log Probabilities',
			name: 'top_logprobs',
			type: 'number',
			typeOptions: { minValue: 0, maxValue: 20 },
			default: 0,
			description: 'How many alternative tokens to return per position, up to 20',
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
			displayName: 'Trace',
			name: 'trace',
			type: 'json',
			default: '{}',
			description: 'Observability metadata, for example trace_id or span_id',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: '',
			description: 'Stable per-end-user identifier used for abuse isolation',
		},
	],
};

/**
 * Files sent alongside the prompt. Only offered on the simple input modes: the
 * raw modes already hand you the content array, so building parts for you there
 * would only get in the way.
 */
export const attachmentsField: INodeProperties = {
	displayName: 'Attachments',
	name: 'attachments',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true, sortable: true },
	placeholder: 'Add Attachment',
	default: {},
	description:
		'Images, video, audio or documents to send with the prompt. The model has to accept that kind of input - check its listing on OpenRouter first.',
	displayOptions: {
		show: {
			inputMode: ['simple'],
		},
	},
	options: [
		{
			displayName: 'Attachment',
			name: 'attachment',
			values: [
				{
					displayName: 'Type',
					name: 'type',
					type: 'options',
					default: 'auto',
					description: 'What kind of content this is. Auto works it out from the file type.',
					options: [
						{ name: 'Audio', value: 'audio' },
						{ name: 'Auto', value: 'auto', description: 'Decide from the file type' },
						{ name: 'File', value: 'file', description: 'PDF or other document' },
						{ name: 'Image', value: 'image' },
						{ name: 'Video', value: 'video' },
					],
				},
				{
					displayName: 'Source',
					name: 'source',
					type: 'options',
					default: 'binary',
					description: 'Where the file comes from',
					options: [
						{
							name: 'Base64 String',
							value: 'base64',
							description: 'Already-encoded data held in a field',
						},
						{
							name: 'Binary Field',
							value: 'binary',
							description: 'A file attached to the incoming item',
						},
						{ name: 'URL', value: 'url', description: 'A link the provider can fetch itself' },
					],
				},
				{
					displayName: 'Input Binary Field',
					name: 'binaryField',
					type: 'string',
					default: 'data',
					required: true,
					description: 'Name of the binary field on the incoming item holding the file',
					displayOptions: {
						show: {
							source: ['binary'],
						},
					},
				},
				{
					displayName: 'URL',
					name: 'url',
					type: 'string',
					default: '',
					required: true,
					placeholder: 'https://example.com/photo.jpg',
					description:
						'Link to the file. The provider downloads this itself, so it has to be publicly reachable - many block crawlers, in which case use a binary field instead.',
					displayOptions: {
						show: {
							source: ['url'],
						},
					},
				},
				{
					displayName: 'Base64 Data',
					name: 'base64',
					type: 'string',
					default: '',
					required: true,
					description: 'The encoded file. A full data: URL is accepted too.',
					displayOptions: {
						show: {
							source: ['base64'],
						},
					},
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					placeholder: 'Add Option',
					default: {},
					options: [
						{
							displayName: 'Audio Format',
							name: 'audioFormat',
							type: 'string',
							default: '',
							placeholder: 'mp3',
							description:
								'Overrides the format worked out from the file. Only used for audio attachments.',
						},
						{
							displayName: 'File Name',
							name: 'fileName',
							type: 'string',
							default: '',
							description:
								'Overrides the name taken from the file. Some models use it as a hint about the document.',
						},
						{
							displayName: 'Image Detail',
							name: 'detail',
							type: 'options',
							default: 'auto',
							description: 'How much resolution the model should spend on the image',
							options: [
								{ name: 'Auto', value: 'auto' },
								{ name: 'High', value: 'high' },
								{ name: 'Low', value: 'low' },
								{ name: 'Original', value: 'original' },
							],
						},
						{
							displayName: 'MIME Type',
							name: 'mimeType',
							type: 'string',
							default: '',
							placeholder: 'image/png',
							description:
								'Overrides the type worked out from the file. Set this when a file arrives without one.',
						},
					],
				},
			],
		},
	],
};

/** Model fallback chain, tried in order when the primary model fails. */
export const fallbackModelsField: INodeProperties = {
	displayName: 'Fallback Models',
	name: 'fallbackModels',
	type: 'string',
	default: '',
	placeholder: 'anthropic/claude-sonnet-4, openai/gpt-5.2',
	description: 'Comma-separated models to try in order if the primary model fails or is unavailable',
};

/** Structured output configuration. */
export const responseFormatField: INodeProperties = {
	displayName: 'Response Format',
	name: 'responseFormat',
	type: 'options',
	default: 'text',
	description: 'Shape of the response the model must produce',
	options: [
		{ name: 'Grammar', value: 'grammar', description: 'Constrain output to a formal grammar' },
		{ name: 'JSON Object', value: 'json_object', description: 'Any valid JSON object' },
		{ name: 'JSON Schema', value: 'json_schema', description: 'JSON matching a schema you supply' },
		{ name: 'Python', value: 'python', description: 'Constrain output to valid Python' },
		{ name: 'Text', value: 'text', description: 'Plain text, the default' },
	],
};

/** The schema/grammar body that pairs with the response format selector. */
export const responseFormatDetailFields: INodeProperties[] = [
	{
		displayName: 'JSON Schema',
		name: 'jsonSchema',
		type: 'json',
		default: '{\n  "name": "response",\n  "strict": true,\n  "schema": {\n    "type": "object",\n    "properties": {},\n    "additionalProperties": false\n  }\n}',
		description: 'The JSON Schema the response must satisfy',
		displayOptions: {
			show: {
				responseFormat: ['json_schema'],
			},
		},
	},
	{
		displayName: 'Grammar',
		name: 'grammarDefinition',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description: 'The grammar definition constraining the output',
		displayOptions: {
			show: {
				responseFormat: ['grammar'],
			},
		},
	},
];

/** Tool/function-calling configuration. */
export const toolsFields: INodeProperties[] = [
	{
		displayName: 'Tools',
		name: 'tools',
		type: 'json',
		default: '[]',
		description: 'Tool definitions in OpenAI function-calling format, as a JSON array',
	},
	{
		displayName: 'Tool Choice',
		name: 'toolChoice',
		type: 'string',
		default: '',
		placeholder: 'auto, none, required, or a tool name',
		description:
			'How the model picks tools. Use auto, none, required, or a specific tool name. Leave empty for the default.',
	},
];

/** Attribution headers OpenRouter uses for its public app leaderboard. */
export const attributionField: INodeProperties = {
	displayName: 'Attribution',
	name: 'attribution',
	type: 'collection',
	placeholder: 'Add Attribution Field',
	default: {},
	description: 'Optional headers that credit your app on the OpenRouter leaderboard',
	options: [
		{
			displayName: 'App Name',
			name: 'appName',
			type: 'string',
			default: '',
			description: 'Sent as the X-Title header',
		},
		{
			displayName: 'Site URL',
			name: 'siteUrl',
			type: 'string',
			default: '',
			description: 'Sent as the HTTP-Referer header',
		},
	],
};
