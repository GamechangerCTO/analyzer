import { vi } from 'vitest'

export function createMockOpenAI(overrides?: {
  responseText?: string
  transcriptionText?: string
}) {
  return {
    responses: {
      create: vi.fn().mockResolvedValue({
        output_text: overrides?.responseText ?? '{"result": "test"}',
      }),
    },
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: overrides?.responseText ?? '{"result": "test"}',
              },
            },
          ],
        }),
      },
    },
    audio: {
      transcriptions: {
        create: vi.fn().mockResolvedValue({
          text: overrides?.transcriptionText ?? 'שלום, אני רוצה לדבר על השירות שלכם',
        }),
      },
    },
  }
}

export function setupOpenAIMock(mockInstance: ReturnType<typeof createMockOpenAI>) {
  vi.mock('openai', () => ({
    default: vi.fn().mockImplementation(() => mockInstance),
  }))
}
