import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';

import {
	buildAttachmentParts,
	buildAttributionHeaders,
	buildGenerationOptions,
	buildPlugins,
	buildProviderPreferences,
	buildReasoning,
	buildResponseFormat,
	csvToArray,
	guessAudioFormat,
	loadOptions,
	openRouterApiRequest,
	parseJsonField,
	pruneEmpty,
} from './GenericFunctions';
import { audioFields, audioOperations } from './descriptions/AudioDescription';
import { chatFields, chatOperations } from './descriptions/ChatDescription';
import { embeddingFields, embeddingOperations } from './descriptions/EmbeddingDescription';
import { imageFields, imageOperations } from './descriptions/ImageDescription';
import { messageFields, messageOperations } from './descriptions/MessagesDescription';
import { modelFields, modelOperations } from './descriptions/ModelDescription';
import { rerankFields, rerankOperations } from './descriptions/RerankDescription';
import { responseFields, responseOperations } from './descriptions/ResponsesDescription';
import { videoFields, videoOperations } from './descriptions/VideoDescription';

/** Video job states that mean there is nothing left to wait for. */
const VIDEO_TERMINAL_STATES = ['completed', 'failed', 'cancelled', 'expired'];

export class OpenRouter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenRouter',
		name: 'openRouter',
		icon: { light: 'file:openrouter.svg', dark: 'file:openrouter.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description:
			'Use the OpenRouter API — chat, responses, images, video, audio, embeddings and reranking, with provider routing and plugins',
		defaults: {
			name: 'OpenRouter',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'openRouterApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Audio', value: 'audio' },
					{ name: 'Chat', value: 'chat' },
					{ name: 'Embedding', value: 'embedding' },
					{ name: 'Image', value: 'image' },
					{ name: 'Message', value: 'message' },
					{ name: 'Model', value: 'model' },
					{ name: 'Rerank', value: 'rerank' },
					{ name: 'Response', value: 'response' },
					{ name: 'Video', value: 'video' },
				],
				default: 'chat',
			},
			...chatOperations,
			...chatFields,
			...responseOperations,
			...responseFields,
			...messageOperations,
			...messageFields,
			...imageOperations,
			...imageFields,
			...videoOperations,
			...videoFields,
			...audioOperations,
			...audioFields,
			...embeddingOperations,
			...embeddingFields,
			...rerankOperations,
			...rerankFields,
			...modelOperations,
			...modelFields,
		],
	};

	methods = {
		loadOptions,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		/** Reads the shared routing/plugin collections and folds them into a request body. */
		const applySharedFields = (body: IDataObject, i: number): IDataObject => {
			const provider = buildProviderPreferences(
				this.getNodeParameter('providerRouting', i, {}) as IDataObject,
			);
			if (provider) body.provider = provider;

			const plugins = buildPlugins(this.getNodeParameter('plugins', i, {}) as IDataObject);
			if (plugins) body.plugins = plugins;

			const fallbacks = csvToArray(this.getNodeParameter('fallbackModels', i, '') as string);
			if (fallbacks.length) body.models = fallbacks;

			return body;
		};

		/** Reads the tools JSON + tool choice pair, if the resource exposes them. */
		const applyTools = (body: IDataObject, i: number): void => {
			const tools = parseJsonField(
				this,
				this.getNodeParameter('tools', i, '[]'),
				'Tools',
				i,
			);
			if (Array.isArray(tools) && tools.length) body.tools = tools;

			const toolChoice = this.getNodeParameter('toolChoice', i, '') as string;
			if (toolChoice) {
				body.tool_choice = ['auto', 'none', 'required'].includes(toolChoice)
					? toolChoice
					: { type: 'function', function: { name: toolChoice } };
			}
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const headers = buildAttributionHeaders(
					this.getNodeParameter('attribution', i, {}) as IDataObject,
				);

				// ---------------------------------------------------------------- chat
				if (resource === 'chat' && operation === 'complete') {
					const inputMode = this.getNodeParameter('inputMode', i) as string;

					let messages: IDataObject[];
					if (inputMode === 'messages') {
						messages = parseJsonField(
							this,
							this.getNodeParameter('messages', i),
							'Messages',
							i,
						) as IDataObject[];
					} else {
						const systemMessage = this.getNodeParameter('systemMessage', i, '') as string;
						const prompt = this.getNodeParameter('prompt', i) as string;
						const attachments = await buildAttachmentParts.call(
							this,
							this.getNodeParameter('attachments', i, {}) as IDataObject,
							i,
							'chat',
						);

						messages = [];
						if (systemMessage) messages.push({ role: 'system', content: systemMessage });
						messages.push({
							role: 'user',
							// A plain string is the friendlier shape when there is nothing to attach.
							content: attachments.length
								? [{ type: 'text', text: prompt }, ...attachments]
								: prompt,
						});
					}

					const body: IDataObject = {
						model: this.getNodeParameter('model', i) as string,
						messages,
						stream: false,
						...buildGenerationOptions(
							this,
							this.getNodeParameter('options', i, {}) as IDataObject,
							i,
						),
					};

					applySharedFields(body, i);
					applyTools(body, i);

					const responseFormat = buildResponseFormat(
						this,
						this.getNodeParameter('responseFormat', i, 'text') as string,
						i,
					);
					if (responseFormat) body.response_format = responseFormat;

					const reasoning = buildReasoning(
						this.getNodeParameter('reasoning', i, {}) as IDataObject,
					);
					if (reasoning) body.reasoning = reasoning;

					const response = await openRouterApiRequest.call(
						this,
						'POST',
						'/chat/completions',
						body,
						{},
						{},
						headers,
					);

					const simplify = this.getNodeParameter('simplify', i, false) as boolean;
					const json = simplify
						? {
								content: response?.choices?.[0]?.message?.content ?? '',
								reasoning: response?.choices?.[0]?.message?.reasoning,
								tool_calls: response?.choices?.[0]?.message?.tool_calls,
								finish_reason: response?.choices?.[0]?.finish_reason,
								model: response?.model,
								provider: response?.provider,
								usage: response?.usage,
							}
						: response;

					returnData.push({ json, pairedItem: { item: i } });
				}

				// ------------------------------------------------------------ response
				else if (resource === 'response' && operation === 'create') {
					const inputMode = this.getNodeParameter('inputMode', i) as string;

					let input: string | IDataObject[];
					if (inputMode === 'items') {
						input = parseJsonField(this, this.getNodeParameter('inputItems', i), 'Input Items', i);
					} else {
						const text = this.getNodeParameter('input', i) as string;
						const attachments = await buildAttachmentParts.call(
							this,
							this.getNodeParameter('attachments', i, {}) as IDataObject,
							i,
							'responses',
						);
						input = attachments.length
							? [{ role: 'user', content: [{ type: 'input_text', text }, ...attachments] }]
							: text;
					}

					const body: IDataObject = {
						model: this.getNodeParameter('model', i) as string,
						input,
						stream: false,
						...buildGenerationOptions(
							this,
							this.getNodeParameter('options', i, {}) as IDataObject,
							i,
						),
					};

					const instructions = this.getNodeParameter('instructions', i, '') as string;
					if (instructions) body.instructions = instructions;

					const maxOutputTokens = this.getNodeParameter('maxOutputTokens', i, 0) as number;
					if (maxOutputTokens) body.max_output_tokens = maxOutputTokens;

					// The Responses API names this field differently from Chat.
					if (body.max_completion_tokens !== undefined) delete body.max_completion_tokens;

					applySharedFields(body, i);
					applyTools(body, i);

					const reasoning = buildReasoning(
						this.getNodeParameter('reasoning', i, {}) as IDataObject,
					);
					if (reasoning) body.reasoning = reasoning;

					const response = await openRouterApiRequest.call(
						this,
						'POST',
						'/responses',
						body,
						{},
						{},
						headers,
					);

					const simplify = this.getNodeParameter('simplify', i, false) as boolean;
					const json = simplify
						? {
								output_text: extractResponsesText(response),
								status: response?.status,
								model: response?.model,
								usage: response?.usage,
							}
						: response;

					returnData.push({ json, pairedItem: { item: i } });
				}

				// ------------------------------------------------------------- message
				else if (resource === 'message' && operation === 'create') {
					const inputMode = this.getNodeParameter('inputMode', i) as string;

					let messages: IDataObject[];
					if (inputMode === 'messages') {
						messages = parseJsonField(
							this,
							this.getNodeParameter('messages', i),
							'Messages',
							i,
						) as IDataObject[];
					} else {
						messages = [
							{ role: 'user', content: this.getNodeParameter('prompt', i) as string },
						];
					}

					const options = this.getNodeParameter('options', i, {}) as IDataObject;
					const body: IDataObject = {
						model: this.getNodeParameter('model', i) as string,
						messages,
						max_tokens: this.getNodeParameter('maxTokens', i) as number,
						stream: false,
					};

					const system = this.getNodeParameter('system', i, '') as string;
					if (system) body.system = system;

					const thinking = this.getNodeParameter('thinking', i, {}) as IDataObject;
					if (Object.keys(thinking).length) {
						body.thinking = thinking.enabled
							? { type: 'enabled', budget_tokens: thinking.budget_tokens ?? 1024 }
							: { type: 'disabled' };
					}

					if (options.temperature !== undefined && options.temperature !== 1) {
						body.temperature = options.temperature;
					}
					if (options.top_p !== undefined && options.top_p !== 1) body.top_p = options.top_p;
					if (options.top_k) body.top_k = options.top_k;
					if (options.user) body.user = options.user;
					if (options.session_id) body.session_id = options.session_id;
					const stopSequences = csvToArray(options.stop_sequences as string);
					if (stopSequences.length) body.stop_sequences = stopSequences;

					applySharedFields(body, i);
					applyTools(body, i);

					// The Messages API calls the fallback list "fallbacks".
					if (body.models) {
						body.fallbacks = body.models;
						delete body.models;
					}

					const response = await openRouterApiRequest.call(
						this,
						'POST',
						'/messages',
						body,
						{},
						{},
						headers,
					);

					const simplify = this.getNodeParameter('simplify', i, false) as boolean;
					const json = simplify
						? {
								text: (response?.content ?? [])
									.filter((part: IDataObject) => part.type === 'text')
									.map((part: IDataObject) => part.text)
									.join(''),
								stop_reason: response?.stop_reason,
								model: response?.model,
								usage: response?.usage,
							}
						: response;

					returnData.push({ json, pairedItem: { item: i } });
				}

				// --------------------------------------------------------------- image
				else if (resource === 'image') {
					if (operation === 'listModels') {
						const response = await openRouterApiRequest.call(this, 'GET', '/images/models');
						for (const model of (response?.data ?? []) as IDataObject[]) {
							returnData.push({ json: model, pairedItem: { item: i } });
						}
					} else if (operation === 'generate') {
						const options = this.getNodeParameter('options', i, {}) as IDataObject;
						const body: IDataObject = pruneEmpty({
							model: this.getNodeParameter('model', i) as string,
							prompt: this.getNodeParameter('prompt', i) as string,
							aspect_ratio: options.aspect_ratio,
							background: options.background,
							n: options.n,
							output_compression: options.output_compression || undefined,
							output_format: options.output_format,
							quality: options.quality,
							resolution: options.resolution,
							seed: options.seed || undefined,
							size: options.size,
							stream: false,
						});

						const references = csvToArray(
							this.getNodeParameter('inputReferences', i, '') as string,
						);
						if (references.length) {
							body.input_references = references.map((property) => {
								const binary = this.helpers.assertBinaryData(i, property);
								return {
									type: 'image_url',
									image_url: { url: `data:${binary.mimeType};base64,${binary.data}` },
								};
							});
						}

						const provider = buildProviderPreferences(
							this.getNodeParameter('providerRouting', i, {}) as IDataObject,
						);
						if (provider) body.provider = provider;

						const response = await openRouterApiRequest.call(
							this,
							'POST',
							'/images',
							body,
							{},
							{},
							headers,
						);

						const binaryPropertyName = this.getNodeParameter(
							'binaryPropertyName',
							i,
							'data',
						) as string;
						const images = (response?.data ?? []) as IDataObject[];

						if (!images.length) {
							throw new NodeOperationError(this.getNode(), 'The API returned no images', {
								itemIndex: i,
							});
						}

						for (const [index, image] of images.entries()) {
							const mimeType = (image.media_type as string) ?? 'image/png';
							const extension = mimeType.split('/')[1] ?? 'png';
							const buffer = Buffer.from(image.b64_json as string, 'base64');
							returnData.push({
								json: { created: response?.created, usage: response?.usage, index },
								binary: {
									[binaryPropertyName]: await this.helpers.prepareBinaryData(
										buffer,
										`image_${index}.${extension}`,
										mimeType,
									),
								},
								pairedItem: { item: i },
							});
						}
					}
				}

				// --------------------------------------------------------------- video
				else if (resource === 'video') {
					if (operation === 'listModels') {
						const response = await openRouterApiRequest.call(this, 'GET', '/videos/models');
						for (const model of (response?.data ?? []) as IDataObject[]) {
							returnData.push({ json: model, pairedItem: { item: i } });
						}
					} else if (operation === 'get') {
						const jobId = this.getNodeParameter('jobId', i) as string;
						const response = await openRouterApiRequest.call(
							this,
							'GET',
							`/videos/${encodeURIComponent(jobId)}`,
						);
						returnData.push({ json: response, pairedItem: { item: i } });
					} else if (operation === 'download') {
						const jobId = this.getNodeParameter('jobId', i) as string;
						const binaryPropertyName = this.getNodeParameter(
							'binaryPropertyName',
							i,
							'data',
						) as string;
						returnData.push(
							await downloadVideo.call(this, jobId, binaryPropertyName, i),
						);
					} else {
						// generate and generateAndWait share the same submission body
						const options = this.getNodeParameter('options', i, {}) as IDataObject;
						const body: IDataObject = pruneEmpty({
							model: this.getNodeParameter('model', i) as string,
							prompt: this.getNodeParameter('prompt', i, '') as string,
							aspect_ratio: options.aspect_ratio,
							callback_url: options.callback_url,
							duration: options.duration || undefined,
							generate_audio: options.generate_audio,
							resolution: options.resolution,
							seed: options.seed || undefined,
							size: options.size,
						});

						const references = csvToArray(
							this.getNodeParameter('inputReferences', i, '') as string,
						);
						if (references.length) {
							body.input_references = references.map((property) => {
								const binary = this.helpers.assertBinaryData(i, property);
								return {
									type: 'image_url',
									image_url: { url: `data:${binary.mimeType};base64,${binary.data}` },
								};
							});
						}

						const provider = buildProviderPreferences(
							this.getNodeParameter('providerRouting', i, {}) as IDataObject,
						);
						if (provider) body.provider = provider;

						const job = await openRouterApiRequest.call(
							this,
							'POST',
							'/videos',
							body,
							{},
							{},
							headers,
						);

						if (operation === 'generate') {
							returnData.push({ json: job, pairedItem: { item: i } });
						} else {
							const jobId = (job?.id ?? job?.generation_id) as string;
							if (!jobId) {
								throw new NodeOperationError(
									this.getNode(),
									'The API did not return a video job ID',
									{ itemIndex: i },
								);
							}

							const pollInterval =
								(this.getNodeParameter('pollInterval', i, 10) as number) * 1000;
							const timeoutMs =
								(this.getNodeParameter('pollTimeout', i, 15) as number) * 60 * 1000;
							const deadline = Date.now() + timeoutMs;

							let status = (job?.status as string) ?? 'pending';
							let latest: IDataObject = job;

							while (!VIDEO_TERMINAL_STATES.includes(status)) {
								if (Date.now() > deadline) {
									throw new NodeOperationError(
										this.getNode(),
										`Video generation did not finish within the timeout. Last status: ${status}. Job ID ${jobId} can still be polled with the Get Status operation.`,
										{ itemIndex: i },
									);
								}
								await sleep(pollInterval);
								latest = await openRouterApiRequest.call(
									this,
									'GET',
									`/videos/${encodeURIComponent(jobId)}`,
								);
								status = (latest?.status as string) ?? status;
							}

							if (status !== 'completed') {
								throw new NodeOperationError(
									this.getNode(),
									`Video generation ${status}${latest?.error ? `: ${latest.error}` : ''}`,
									{ itemIndex: i },
								);
							}

							const binaryPropertyName = this.getNodeParameter(
								'binaryPropertyName',
								i,
								'data',
							) as string;
							const downloaded = await downloadVideo.call(
								this,
								jobId,
								binaryPropertyName,
								i,
							);
							downloaded.json = { ...latest, ...downloaded.json };
							returnData.push(downloaded);
						}
					}
				}

				// --------------------------------------------------------------- audio
				else if (resource === 'audio') {
					const options = this.getNodeParameter('options', i, {}) as IDataObject;
					const provider = buildProviderPreferences(
						this.getNodeParameter('providerRouting', i, {}) as IDataObject,
					);

					if (operation === 'textToSpeech') {
						const body: IDataObject = pruneEmpty({
							model: this.getNodeParameter('model', i) as string,
							input: this.getNodeParameter('input', i) as string,
							voice: options.voice,
							response_format: options.response_format,
							speed: options.speed !== 1 ? options.speed : undefined,
						});
						if (provider) body.provider = provider;

						const format = (options.response_format as string) ?? 'mp3';
						const response = await openRouterApiRequest.call(
							this,
							'POST',
							'/audio/speech',
							body,
							{},
							{ json: false, encoding: 'arraybuffer' },
							headers,
						);

						const binaryPropertyName = this.getNodeParameter(
							'binaryPropertyName',
							i,
							'data',
						) as string;
						const mimeType = format === 'pcm' ? 'audio/pcm' : 'audio/mpeg';

						returnData.push({
							json: { model: body.model, format },
							binary: {
								[binaryPropertyName]: await this.helpers.prepareBinaryData(
									Buffer.from(response as ArrayBuffer),
									`speech.${format}`,
									mimeType,
								),
							},
							pairedItem: { item: i },
						});
					} else if (operation === 'transcribe') {
						const binaryPropertyName = this.getNodeParameter(
							'binaryPropertyName',
							i,
							'data',
						) as string;
						const binary = this.helpers.assertBinaryData(i, binaryPropertyName);
						const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						const body: IDataObject = pruneEmpty({
							model: this.getNodeParameter('model', i) as string,
							input_audio: {
								data: buffer.toString('base64'),
								format: guessAudioFormat(binary.fileExtension, binary.mimeType),
							},
							language: options.language,
							response_format: options.response_format,
							temperature: options.temperature || undefined,
							timestamp_granularities: options.timestamp_granularities,
						});
						if (provider) body.provider = provider;

						const response = await openRouterApiRequest.call(
							this,
							'POST',
							'/audio/transcriptions',
							body,
							{},
							{},
							headers,
						);
						returnData.push({ json: response, pairedItem: { item: i } });
					}
				}

				// ----------------------------------------------------------- embedding
				else if (resource === 'embedding') {
					if (operation === 'listModels') {
						const response = await openRouterApiRequest.call(this, 'GET', '/embeddings/models');
						for (const model of (response?.data ?? []) as IDataObject[]) {
							returnData.push({ json: model, pairedItem: { item: i } });
						}
					} else {
						const options = this.getNodeParameter('options', i, {}) as IDataObject;
						const rawInput = this.getNodeParameter('input', i) as string;
						const lines = rawInput
							.split('\n')
							.map((line) => line.trim())
							.filter((line) => line.length > 0);

						const body: IDataObject = pruneEmpty({
							model: this.getNodeParameter('model', i) as string,
							input: lines.length > 1 ? lines : rawInput,
							dimensions: options.dimensions || undefined,
							encoding_format: options.encoding_format,
							input_type: options.input_type,
							user: options.user,
						});

						const provider = buildProviderPreferences(
							this.getNodeParameter('providerRouting', i, {}) as IDataObject,
						);
						if (provider) body.provider = provider;

						const response = await openRouterApiRequest.call(
							this,
							'POST',
							'/embeddings',
							body,
							{},
							{},
							headers,
						);
						returnData.push({ json: response, pairedItem: { item: i } });
					}
				}

				// -------------------------------------------------------------- rerank
				else if (resource === 'rerank') {
					const documentsSource = this.getNodeParameter('documentsSource', i) as string;
					const documents =
						documentsSource === 'json'
							? parseJsonField(this, this.getNodeParameter('documentsJson', i), 'Documents', i)
							: (this.getNodeParameter('documentsText', i) as string)
									.split('\n')
									.map((line) => line.trim())
									.filter((line) => line.length > 0);

					const body: IDataObject = {
						model: this.getNodeParameter('model', i) as string,
						query: this.getNodeParameter('query', i) as string,
						documents,
					};

					const topN = this.getNodeParameter('topN', i, 0) as number;
					if (topN) body.top_n = topN;

					const provider = buildProviderPreferences(
						this.getNodeParameter('providerRouting', i, {}) as IDataObject,
					);
					if (provider) body.provider = provider;

					const response = await openRouterApiRequest.call(
						this,
						'POST',
						'/rerank',
						body,
						{},
						{},
						headers,
					);
					returnData.push({ json: response, pairedItem: { item: i } });
				}

				// --------------------------------------------------------------- model
				else if (resource === 'model') {
					if (operation === 'list') {
						const userFiltered = this.getNodeParameter('userFiltered', i, false) as boolean;
						const options = this.getNodeParameter('options', i, {}) as IDataObject;
						const qs: IDataObject = {};
						if (options.category) qs.category = options.category;
						const supported = csvToArray(options.supported_parameters as string);
						if (supported.length) qs.supported_parameters = supported.join(',');

						const response = await openRouterApiRequest.call(
							this,
							'GET',
							userFiltered ? '/models/user' : '/models',
							{},
							qs,
						);
						for (const model of (response?.data ?? []) as IDataObject[]) {
							returnData.push({ json: model, pairedItem: { item: i } });
						}
					} else if (operation === 'get' || operation === 'listEndpoints') {
						const slug = this.getNodeParameter('model', i) as string;
						const [author, ...rest] = slug.split('/');
						const modelSlug = rest.join('/');

						if (!author || !modelSlug) {
							throw new NodeOperationError(
								this.getNode(),
								`"${slug}" is not a valid model ID. Expected the form author/slug.`,
								{ itemIndex: i },
							);
						}

						const endpoint =
							operation === 'get'
								? `/model/${author}/${modelSlug}`
								: `/models/${author}/${modelSlug}/endpoints`;
						const response = await openRouterApiRequest.call(this, 'GET', endpoint);
						returnData.push({ json: response?.data ?? response, pairedItem: { item: i } });
					} else if (operation === 'listProviders') {
						const response = await openRouterApiRequest.call(this, 'GET', '/providers');
						for (const provider of (response?.data ?? []) as IDataObject[]) {
							returnData.push({ json: provider, pairedItem: { item: i } });
						}
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

/** Downloads a finished video job into a binary property. */
async function downloadVideo(
	this: IExecuteFunctions,
	jobId: string,
	binaryPropertyName: string,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const response = await openRouterApiRequest.call(
		this,
		'GET',
		`/videos/${encodeURIComponent(jobId)}/content`,
		{},
		{},
		{ json: false, encoding: 'arraybuffer' },
	);

	return {
		json: { jobId },
		binary: {
			[binaryPropertyName]: await this.helpers.prepareBinaryData(
				Buffer.from(response as ArrayBuffer),
				`${jobId}.mp4`,
				'video/mp4',
			),
		},
		pairedItem: { item: itemIndex },
	};
}

/** Pulls the plain text out of a Responses API payload. */
function extractResponsesText(response: IDataObject): string {
	if (typeof response?.output_text === 'string') return response.output_text;

	const output = (response?.output ?? []) as IDataObject[];
	return output
		.flatMap((item) => (item.content ?? []) as IDataObject[])
		.filter((part) => part.type === 'output_text')
		.map((part) => part.text as string)
		.join('');
}

/** Best-effort audio format for the transcription payload. */
