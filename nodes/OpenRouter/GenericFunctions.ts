import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';

export const CREDENTIAL_NAME = 'openRouterApi';
const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Single entry point for every OpenRouter call. Authentication, base URL and
 * attribution headers are applied here so the resource handlers stay thin.
 */
export async function openRouterApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	extraOptions: Partial<IHttpRequestOptions> = {},
	headers: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials(CREDENTIAL_NAME);
	const baseUrl = ((credentials.url as string) || DEFAULT_BASE_URL).replace(/\/$/, '');

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
		json: true,
		...extraOptions,
	};

	if (Object.keys(body).length > 0) {
		options.body = body;
	}
	if (Object.keys(qs).length > 0) {
		options.qs = qs;
	}

	return await this.helpers.httpRequestWithAuthentication.call(this, CREDENTIAL_NAME, options);
}

/** Splits a comma-separated UI string into a trimmed array, dropping empties. */
export function csvToArray(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

/**
 * Parses a JSON-typed UI field. n8n hands these over as strings, but an
 * expression can also resolve straight to an object.
 */
export function parseJsonField(
	context: IExecuteFunctions,
	value: unknown,
	fieldName: string,
	itemIndex: number,
): any {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value === 'object') return value;
	try {
		return jsonParse(value as string);
	} catch {
		throw new NodeOperationError(
			context.getNode(),
			`The "${fieldName}" field does not contain valid JSON`,
			{ itemIndex },
		);
	}
}

/** Drops keys whose value is undefined, null, empty string or empty array. */
export function pruneEmpty(input: IDataObject): IDataObject {
	const output: IDataObject = {};
	for (const [key, value] of Object.entries(input)) {
		if (value === undefined || value === null || value === '') continue;
		if (Array.isArray(value) && value.length === 0) continue;
		if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
			continue;
		}
		output[key] = value;
	}
	return output;
}

/**
 * Turns the Provider Routing collection into OpenRouter's `provider` object.
 * Numeric fields treat 0 as "not set", matching how the UI defaults behave.
 */
export function buildProviderPreferences(ui: IDataObject): IDataObject | undefined {
	if (!ui || Object.keys(ui).length === 0) return undefined;

	const provider: IDataObject = {};

	if (ui.order !== undefined && (ui.order as string[]).length) provider.order = ui.order;
	if (ui.only !== undefined && (ui.only as string[]).length) provider.only = ui.only;
	if (ui.ignore !== undefined && (ui.ignore as string[]).length) provider.ignore = ui.ignore;
	if (ui.quantizations !== undefined && (ui.quantizations as string[]).length) {
		provider.quantizations = ui.quantizations;
	}
	if (ui.allow_fallbacks !== undefined) provider.allow_fallbacks = ui.allow_fallbacks;
	if (ui.require_parameters !== undefined) provider.require_parameters = ui.require_parameters;
	if (ui.enforce_distillable_text !== undefined) {
		provider.enforce_distillable_text = ui.enforce_distillable_text;
	}
	if (ui.data_collection !== undefined) provider.data_collection = ui.data_collection;
	if (ui.zdr !== undefined) provider.zdr = ui.zdr;
	if (ui.sort !== undefined) provider.sort = ui.sort;
	if (ui.preferred_max_latency) provider.preferred_max_latency = ui.preferred_max_latency;
	if (ui.preferred_min_throughput) provider.preferred_min_throughput = ui.preferred_min_throughput;

	// max_price values go over the wire as strings, per the API schema.
	const maxPriceUi = (ui.max_price as IDataObject) ?? {};
	const maxPrice: IDataObject = {};
	for (const key of ['prompt', 'completion', 'image', 'request']) {
		const value = maxPriceUi[key];
		if (value !== undefined && value !== null && value !== 0) {
			maxPrice[key] = String(value);
		}
	}
	if (Object.keys(maxPrice).length) provider.max_price = maxPrice;

	return Object.keys(provider).length ? provider : undefined;
}

/**
 * Turns the Plugins fixedCollection into OpenRouter's discriminated `plugins`
 * array. Each UI group maps to exactly one plugin id.
 */
export function buildPlugins(ui: IDataObject): IDataObject[] | undefined {
	if (!ui || Object.keys(ui).length === 0) return undefined;

	const plugins: IDataObject[] = [];
	const first = (key: string): IDataObject | undefined => {
		const entries = ui[key] as IDataObject[] | undefined;
		return entries && entries.length ? entries[0] : undefined;
	};

	const web = first('web');
	if (web) {
		plugins.push(
			pruneEmpty({
				id: 'web',
				engine: web.engine,
				max_results: web.max_results,
				max_uses: web.max_uses || undefined,
				include_domains: csvToArray(web.include_domains as string),
				exclude_domains: csvToArray(web.exclude_domains as string),
			}),
		);
	}

	const webFetch = first('webFetch');
	if (webFetch) {
		plugins.push(
			pruneEmpty({
				id: 'web-fetch',
				max_content_tokens: webFetch.max_content_tokens || undefined,
				max_uses: webFetch.max_uses || undefined,
				allowed_domains: csvToArray(webFetch.allowed_domains as string),
				blocked_domains: csvToArray(webFetch.blocked_domains as string),
			}),
		);
	}

	const fileParser = first('fileParser');
	if (fileParser) {
		plugins.push({
			id: 'file-parser',
			pdf: { engine: fileParser.pdfEngine ?? 'pdf-text' },
		});
	}

	if (first('moderation')) plugins.push({ id: 'moderation' });
	if (first('responseHealing')) plugins.push({ id: 'response-healing' });

	const contextCompression = first('contextCompression');
	if (contextCompression) {
		plugins.push({
			id: 'context-compression',
			engine: contextCompression.engine ?? 'middle-out',
		});
	}

	const autoRouter = first('autoRouter');
	if (autoRouter) {
		plugins.push(
			pruneEmpty({
				id: 'auto-router',
				cost_tier: autoRouter.cost_tier,
				pin_model: autoRouter.pin_model,
				allowed_models: csvToArray(autoRouter.allowed_models as string),
				excluded_models: csvToArray(autoRouter.excluded_models as string),
			}),
		);
	}

	const paretoRouter = first('paretoRouter');
	if (paretoRouter) {
		plugins.push(
			pruneEmpty({
				id: 'pareto-router',
				max_price: paretoRouter.max_price || undefined,
				min_coding_score: paretoRouter.min_coding_score || undefined,
				price_source: paretoRouter.price_source,
			}),
		);
	}

	const fusion = first('fusion');
	if (fusion) {
		plugins.push(
			pruneEmpty({
				id: 'fusion',
				preset: fusion.preset,
				model: fusion.model,
				analysis_models: csvToArray(fusion.analysis_models as string),
				max_tool_calls: fusion.max_tool_calls || undefined,
			}),
		);
	}

	return plugins.length ? plugins : undefined;
}

/**
 * Maps the generation Options collection onto request-body fields. Numeric
 * fields left at their neutral default are omitted so the provider default wins.
 */
export function buildGenerationOptions(
	context: IExecuteFunctions,
	ui: IDataObject,
	itemIndex: number,
): IDataObject {
	const body: IDataObject = {};
	if (!ui || Object.keys(ui).length === 0) return body;

	// Pass through only when the user moved them off their neutral value.
	if (ui.temperature !== undefined && ui.temperature !== 1) body.temperature = ui.temperature;
	if (ui.top_p !== undefined && ui.top_p !== 1) body.top_p = ui.top_p;
	if (ui.top_k) body.top_k = ui.top_k;
	if (ui.top_a) body.top_a = ui.top_a;
	if (ui.min_p) body.min_p = ui.min_p;
	if (ui.frequency_penalty) body.frequency_penalty = ui.frequency_penalty;
	if (ui.presence_penalty) body.presence_penalty = ui.presence_penalty;
	if (ui.repetition_penalty !== undefined && ui.repetition_penalty !== 1) {
		body.repetition_penalty = ui.repetition_penalty;
	}
	if (ui.seed) body.seed = ui.seed;
	if (ui.max_completion_tokens) body.max_completion_tokens = ui.max_completion_tokens;
	if (ui.logprobs) body.logprobs = ui.logprobs;
	if (ui.top_logprobs) body.top_logprobs = ui.top_logprobs;
	if (ui.parallel_tool_calls !== undefined && ui.parallel_tool_calls !== true) {
		body.parallel_tool_calls = ui.parallel_tool_calls;
	}
	if (ui.user) body.user = ui.user;
	if (ui.session_id) body.session_id = ui.session_id;
	if (ui.prompt_cache_key) body.prompt_cache_key = ui.prompt_cache_key;
	if (ui.service_tier && ui.service_tier !== 'auto') body.service_tier = ui.service_tier;
	if (ui.modalities && (ui.modalities as string[]).length) body.modalities = ui.modalities;

	const stop = csvToArray(ui.stop as string);
	if (stop.length) body.stop = stop;

	const logitBias = parseJsonField(context, ui.logit_bias, 'Logit Bias', itemIndex);
	if (logitBias && Object.keys(logitBias).length) body.logit_bias = logitBias;

	const metadata = parseJsonField(context, ui.metadata, 'Metadata', itemIndex);
	if (metadata && Object.keys(metadata).length) body.metadata = metadata;

	const trace = parseJsonField(context, ui.trace, 'Trace', itemIndex);
	if (trace && Object.keys(trace).length) body.trace = trace;

	return body;
}

/** Builds the `reasoning` object from its UI collection. */
export function buildReasoning(ui: IDataObject): IDataObject | undefined {
	if (!ui || Object.keys(ui).length === 0) return undefined;
	const reasoning = pruneEmpty({
		effort: ui.effort,
		summary: ui.summary,
	});
	return Object.keys(reasoning).length ? reasoning : undefined;
}

/** Builds the `response_format` object from the selector plus its detail field. */
export function buildResponseFormat(
	context: IExecuteFunctions,
	format: string,
	itemIndex: number,
): IDataObject | undefined {
	if (!format || format === 'text') return undefined;

	if (format === 'json_object') return { type: 'json_object' };

	if (format === 'json_schema') {
		const schema = parseJsonField(
			context,
			context.getNodeParameter('jsonSchema', itemIndex, '{}'),
			'JSON Schema',
			itemIndex,
		);
		return { type: 'json_schema', json_schema: schema };
	}

	if (format === 'grammar') {
		const grammar = context.getNodeParameter('grammarDefinition', itemIndex, '') as string;
		return { type: 'grammar', grammar };
	}

	if (format === 'python') return { type: 'python' };

	return undefined;
}

/** Converts the Attribution collection into OpenRouter's leaderboard headers. */
export function buildAttributionHeaders(ui: IDataObject): IDataObject {
	const headers: IDataObject = {};
	if (!ui) return headers;
	if (ui.siteUrl) headers['HTTP-Referer'] = ui.siteUrl;
	if (ui.appName) headers['X-Title'] = ui.appName;
	return headers;
}

/* -------------------------------------------------------------------------- */
/* Attachments                                                                */
/* -------------------------------------------------------------------------- */

type AttachmentKind = 'image' | 'video' | 'audio' | 'file';

/** Which API shape the content parts are destined for. */
export type AttachmentFormat = 'chat' | 'responses';

/** An attachment after its source has been read, but before it is shaped. */
interface ResolvedAttachment {
	kind: AttachmentKind;
	/** Base64 with no `data:` prefix. Undefined when the source is a remote URL. */
	base64?: string;
	/** Remote URL. Undefined when the source is binary or raw base64. */
	url?: string;
	mimeType: string;
	fileName: string;
	fileExtension?: string;
	detail?: string;
	audioFormat?: string;
}

/** Enough of a lookup to cover what the multimodal models actually accept. */
const MIME_BY_EXTENSION: Record<string, string> = {
	aac: 'audio/aac',
	aiff: 'audio/aiff',
	avi: 'video/x-msvideo',
	bmp: 'image/bmp',
	csv: 'text/csv',
	flac: 'audio/flac',
	gif: 'image/gif',
	heic: 'image/heic',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	m4a: 'audio/mp4',
	md: 'text/markdown',
	mkv: 'video/x-matroska',
	mov: 'video/quicktime',
	mp3: 'audio/mpeg',
	mp4: 'video/mp4',
	mpeg: 'video/mpeg',
	ogg: 'audio/ogg',
	pdf: 'application/pdf',
	png: 'image/png',
	txt: 'text/plain',
	wav: 'audio/wav',
	webm: 'video/webm',
	webp: 'image/webp',
};

/** Strips any query string, then maps the trailing extension to a MIME type. */
function inferMimeType(fileName: string): string | undefined {
	const extension = extensionOf(fileName);
	if (extension) return MIME_BY_EXTENSION[extension];
	// Some URLs end in a bare type name instead, as placeholder services tend to.
	const bare = fileName.split('?')[0].split('#')[0].toLowerCase();
	return MIME_BY_EXTENSION[bare];
}

function extensionOf(fileName: string): string | undefined {
	const bare = fileName.split('?')[0].split('#')[0];
	if (!bare.includes('.')) return undefined;
	return bare.split('.').pop()?.toLowerCase();
}

/**
 * Maps an audio file to the `format` string the API expects. Explicit extensions
 * win; otherwise the MIME subtype is close enough, once `mpeg` and the `x-`
 * prefixes are normalised.
 */
export function guessAudioFormat(fileExtension?: string, mimeType?: string): string {
	if (fileExtension) return fileExtension.toLowerCase().replace(/^\./, '');
	const subtype = (mimeType ?? '').split('/')[1] ?? 'mp3';
	if (subtype === 'mpeg') return 'mp3';
	return subtype.replace('x-', '');
}

/**
 * Turns the Attachments collection into content parts for the given API shape.
 *
 * Binary fields are read straight off the incoming item and base64-encoded here,
 * so a workflow does not need a separate conversion node in front of this one.
 */
export async function buildAttachmentParts(
	this: IExecuteFunctions,
	ui: IDataObject,
	itemIndex: number,
	format: AttachmentFormat,
): Promise<IDataObject[]> {
	const entries = (ui?.attachment as IDataObject[]) ?? [];
	const parts: IDataObject[] = [];

	for (const entry of entries) {
		const attachment = await resolveAttachment.call(this, entry, itemIndex);
		parts.push(
			format === 'responses'
				? toResponsesPart.call(this, attachment, itemIndex)
				: toChatPart.call(this, attachment, itemIndex),
		);
	}

	return parts;
}

/** Reads one attachment entry from whichever source it points at. */
async function resolveAttachment(
	this: IExecuteFunctions,
	entry: IDataObject,
	itemIndex: number,
): Promise<ResolvedAttachment> {
	const source = (entry.source as string) || 'binary';
	const options = (entry.options as IDataObject) ?? {};

	let base64: string | undefined;
	let url: string | undefined;
	let mimeType = (options.mimeType as string) || '';
	let fileName = (options.fileName as string) || '';

	if (source === 'url') {
		url = ((entry.url as string) || '').trim();
		if (!url) {
			throw new NodeOperationError(
				this.getNode(),
				'An attachment is set to URL but no URL was given',
				{ itemIndex },
			);
		}
		if (!fileName) fileName = url.split('?')[0].split('#')[0].split('/').pop() || 'file';
	} else if (source === 'base64') {
		const raw = ((entry.base64 as string) || '').trim();
		if (!raw) {
			throw new NodeOperationError(
				this.getNode(),
				'An attachment is set to Base64 String but no data was given',
				{ itemIndex },
			);
		}
		// Accept a full data: URL as readily as bare base64, since both are common.
		const dataUrl = /^data:([^;,]+);base64,(.*)$/s.exec(raw);
		if (dataUrl) {
			if (!mimeType) mimeType = dataUrl[1];
			base64 = dataUrl[2];
		} else {
			base64 = raw;
		}
		if (!fileName) fileName = 'file';
	} else {
		const field = (entry.binaryField as string) || 'data';
		const binary = this.helpers.assertBinaryData(itemIndex, field);
		base64 = (await this.helpers.getBinaryDataBuffer(itemIndex, field)).toString('base64');
		if (!mimeType) mimeType = binary.mimeType || '';
		if (!fileName) fileName = binary.fileName || 'file';
	}

	if (!mimeType) mimeType = inferMimeType(fileName) ?? '';

	return {
		kind: resolveKind.call(this, (entry.type as string) || 'auto', mimeType, fileName, itemIndex),
		base64,
		url,
		mimeType,
		fileName,
		fileExtension: extensionOf(fileName),
		detail: (options.detail as string) || undefined,
		audioFormat: (options.audioFormat as string) || undefined,
	};
}

/** Honours an explicit Type, otherwise reads the kind off the MIME type. */
function resolveKind(
	this: IExecuteFunctions,
	declared: string,
	mimeType: string,
	fileName: string,
	itemIndex: number,
): AttachmentKind {
	if (declared !== 'auto') return declared as AttachmentKind;

	if (mimeType.startsWith('image/')) return 'image';
	if (mimeType.startsWith('video/')) return 'video';
	if (mimeType.startsWith('audio/')) return 'audio';
	if (mimeType) return 'file';

	throw new NodeOperationError(
		this.getNode(),
		`Could not tell what kind of attachment "${fileName}" is, because it arrived without a file type. Set Type to Image, Video, Audio or File instead of leaving it on Auto.`,
		{ itemIndex },
	);
}

/**
 * Audio has no remote-URL form in either API, so a link cannot be passed through
 * the way an image or video can.
 */
function requireBase64(
	this: IExecuteFunctions,
	attachment: ResolvedAttachment,
	itemIndex: number,
): string {
	if (attachment.base64) return attachment.base64;
	throw new NodeOperationError(
		this.getNode(),
		'Audio has to be sent as data rather than as a link. Download the file first - an HTTP Request node set to return a file will do it - then point the attachment at that binary field.',
		{ itemIndex },
	);
}

function toChatPart(
	this: IExecuteFunctions,
	attachment: ResolvedAttachment,
	itemIndex: number,
): IDataObject {
	const url = attachment.url ?? `data:${attachment.mimeType};base64,${attachment.base64}`;

	switch (attachment.kind) {
		case 'image':
			return { type: 'image_url', image_url: pruneEmpty({ url, detail: attachment.detail }) };
		case 'video':
			return { type: 'video_url', video_url: { url } };
		case 'audio':
			return {
				type: 'input_audio',
				input_audio: {
					data: requireBase64.call(this, attachment, itemIndex),
					format:
						attachment.audioFormat ??
						guessAudioFormat(attachment.fileExtension, attachment.mimeType),
				},
			};
		default:
			return { type: 'file', file: pruneEmpty({ file_data: url, filename: attachment.fileName }) };
	}
}

function toResponsesPart(
	this: IExecuteFunctions,
	attachment: ResolvedAttachment,
	itemIndex: number,
): IDataObject {
	const url = attachment.url ?? `data:${attachment.mimeType};base64,${attachment.base64}`;

	switch (attachment.kind) {
		case 'image':
			// The Responses schema makes detail required, unlike Chat.
			return { type: 'input_image', image_url: url, detail: attachment.detail ?? 'auto' };
		case 'video':
			return { type: 'input_video', video_url: url };
		case 'audio':
			return {
				type: 'input_audio',
				input_audio: {
					data: requireBase64.call(this, attachment, itemIndex),
					format:
						attachment.audioFormat ??
						guessAudioFormat(attachment.fileExtension, attachment.mimeType),
				},
			};
		default:
			return pruneEmpty({
				type: 'input_file',
				...(attachment.url ? { file_url: attachment.url } : { file_data: url }),
				filename: attachment.fileName,
			});
	}
}

/** Shared shape for the model-list endpoints. */
interface ModelListEntry {
	id?: string;
	slug?: string;
	name?: string;
	canonical_slug?: string;
}

function toModelOptions(data: ModelListEntry[]): INodePropertyOptions[] {
	return data
		.map((model) => {
			const value = model.id ?? model.slug ?? model.canonical_slug ?? '';
			return { name: model.name ?? value, value };
		})
		.filter((option) => option.value !== '')
		.sort((a, b) => a.name.localeCompare(b.name));
}

async function loadModelsFrom(
	context: ILoadOptionsFunctions,
	endpoint: string,
): Promise<INodePropertyOptions[]> {
	const response = await openRouterApiRequest.call(context, 'GET', endpoint);
	return toModelOptions((response?.data ?? []) as ModelListEntry[]);
}

export const loadOptions = {
	async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return await loadModelsFrom(this, '/models');
	},

	async getImageModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return await loadModelsFrom(this, '/images/models');
	},

	async getVideoModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return await loadModelsFrom(this, '/videos/models');
	},

	async getEmbeddingModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return await loadModelsFrom(this, '/embeddings/models');
	},

	async getProviders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const response = await openRouterApiRequest.call(this, 'GET', '/providers');
		const providers = (response?.data ?? []) as Array<{ name?: string; slug?: string }>;
		return providers
			.map((provider) => ({
				name: provider.name ?? provider.slug ?? '',
				value: provider.slug ?? '',
			}))
			.filter((option) => option.value !== '')
			.sort((a, b) => a.name.localeCompare(b.name));
	},
};
