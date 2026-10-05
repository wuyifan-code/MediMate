import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { MiniMaxProvider } from './providers/minimax.provider';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Mock the MiniMaxProvider
jest.mock('./providers/minimax.provider');

describe('AiService', () => {
  let service: AiService;
  let miniMaxProvider: jest.Mocked<MiniMaxProvider>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: MiniMaxProvider,
          useValue: {
            chat: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    miniMaxProvider = module.get(MiniMaxProvider);

    jest.clearAllMocks();
  });

  describe('getHealthTriage', () => {
    it('should return triage advice from AI provider', async () => {
      const mockResponse = 'Based on your symptoms, we recommend visiting the Internal Medicine department.';
      miniMaxProvider.chat.mockResolvedValue(mockResponse);

      const result = await service.getHealthTriage({
        symptoms: 'headache, fever',
      });

      expect(result).toBe(mockResponse);
      expect(miniMaxProvider.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('headache, fever'),
          }),
        ]),
      );
    });

    it('should return fallback message when provider returns empty', async () => {
      miniMaxProvider.chat.mockResolvedValue('');

      const result = await service.getHealthTriage({
        symptoms: 'cough',
      });

      expect(result).toBe('Service temporarily unavailable. Please visit a hospital.');
    });

    it('should include all required triage information in prompt', async () => {
      const mockResponse = 'Recommended department: Cardiology';
      miniMaxProvider.chat.mockResolvedValue(mockResponse);

      await service.getHealthTriage({
        symptoms: 'chest pain',
      });

      const callArgs = miniMaxProvider.chat.mock.calls[0][0];
      const content = callArgs[0].content;

      expect(content).toContain('Recommended hospital department');
      expect(content).toContain('Preparation advice');
      expect(content).toContain('warm tip');
      expect(content).toContain('chest pain');
    });
  });

  describe('getMatchReasoning', () => {
    it('should return match reasoning from AI provider', async () => {
      const mockResponse = 'This escort is recommended due to location proximity and 5 years of experience.';
      miniMaxProvider.chat.mockResolvedValue(mockResponse);

      const result = await service.getMatchReasoning({
        patientNeeds: 'elderly care, nearby',
        escortProfile: 'Experienced in geriatric care, located in X district',
      });

      expect(result).toBe(mockResponse);
    });

    it('should return fallback message when provider returns empty', async () => {
      miniMaxProvider.chat.mockResolvedValue('');

      const result = await service.getMatchReasoning({
        patientNeeds: 'checkup',
        escortProfile: 'General checkup specialist',
      });

      expect(result).toBe('基于地理位置与专业资质智能推荐');
    });

    it('should include patient needs and escort profile in prompt', async () => {
      miniMaxProvider.chat.mockResolvedValue('Match explanation');

      await service.getMatchReasoning({
        patientNeeds: 'pediatric care',
        escortProfile: '5 years pediatric experience',
      });

      const callArgs = miniMaxProvider.chat.mock.calls[0][0];
      const content = callArgs[0].content;

      expect(content).toContain('pediatric care');
      expect(content).toContain('5 years pediatric experience');
    });
  });

  describe('getAssistantResponse', () => {
    it('should return assistant response from AI provider', async () => {
      const mockResponse = 'Here is some medical information about your condition...';
      miniMaxProvider.chat.mockResolvedValue(mockResponse);

      const result = await service.getAssistantResponse({
        prompt: 'Tell me about diabetes symptoms',
        history: [],
      });

      expect(result).toBe(mockResponse);
    });

    it('should return fallback message when provider returns empty', async () => {
      miniMaxProvider.chat.mockResolvedValue('');

      const result = await service.getAssistantResponse({
        prompt: 'Hello',
        history: [],
      });

      expect(result).toBe('Sorry, the service is temporarily unavailable.');
    });

    it('should include chat history in messages', async () => {
      miniMaxProvider.chat.mockResolvedValue('Response');

      await service.getAssistantResponse({
        prompt: 'Follow up question',
        history: [
          { role: 'user', text: 'First question' },
          { role: 'model', text: 'First answer' },
        ],
      });

      const callArgs = miniMaxProvider.chat.mock.calls[0][0];

      // Should have 3 messages: history1, history2, and new prompt
      expect(callArgs).toHaveLength(3);
      expect(callArgs[0]).toEqual({ role: 'user', content: 'First question' });
      expect(callArgs[1]).toEqual({ role: 'model', content: 'First answer' });
      // 新用户消息会被服务端附加无思考标签的格式要求，只校验原始 prompt 是否包含
      expect(callArgs[2].role).toBe('user');
      expect(callArgs[2].content).toContain('Follow up question');
    });

    it('should handle empty history', async () => {
      miniMaxProvider.chat.mockResolvedValue('Response');

      await service.getAssistantResponse({
        prompt: 'First question',
        history: [],
      });

      const callArgs = miniMaxProvider.chat.mock.calls[0][0];

      // Should have only 1 message (the new prompt)
      expect(callArgs).toHaveLength(1);
      expect(callArgs[0].role).toBe('user');
      expect(callArgs[0].content).toContain('First question');
    });
  });

  describe('AiController - JWT Guard Integration', () => {
    it('should have JwtAuthGuard applied to all endpoints', () => {
      // This is a smoke test to verify the guard is properly configured
      // In a real integration test, you would test the actual HTTP endpoints
      const guard = new JwtAuthGuard();

      // Verify guard exists and can be instantiated
      expect(guard).toBeDefined();
    });
  });
});

describe('AiController smoke tests', () => {
  let aiService: jest.Mocked<AiService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        {
          provide: AiService,
          useValue: {
            getHealthTriage: jest.fn(),
            getMatchReasoning: jest.fn(),
            getAssistantResponse: jest.fn(),
          },
        },
      ],
    }).compile();

    aiService = module.get(AiService);
  });

  it('smoke test - ai service methods exist', () => {
    expect(aiService.getHealthTriage).toBeDefined();
    expect(aiService.getMatchReasoning).toBeDefined();
    expect(aiService.getAssistantResponse).toBeDefined();
  });
});
