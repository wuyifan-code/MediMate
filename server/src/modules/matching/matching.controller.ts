import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { MatchingRequestDto } from './dto/matching.dto';

@ApiTags('Matching')
@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post('recommend')
  @ApiOperation({
    summary: '智能陪护匹配推荐',
    description:
      '基于多维加权匹配算法 (MDWMA)，根据患者请求的科室、位置、预算等条件，' +
      '返回按综合匹配度排序的陪诊师推荐列表。每个结果包含 7 个维度的评分明细和可解释性摘要。',
  })
  async recommend(@Body() dto: MatchingRequestDto) {
    return this.matchingService.matchEscorts(dto);
  }

  @Post('detail/:escortId')
  @ApiOperation({
    summary: '单个陪诊师匹配明细',
    description: '查看特定陪诊师对某个患者请求的 7 维匹配评分明细，用于算法可解释性展示。',
  })
  async matchDetail(
    @Param('escortId') escortId: string,
    @Body() dto: MatchingRequestDto,
  ) {
    return this.matchingService.getMatchDetail(escortId, dto);
  }

  @Get('weights')
  @ApiOperation({
    summary: '获取算法权重配置',
    description: '返回 MDWMA 算法的 AHP 权重向量及各维度说明，用于论文可复现性。',
  })
  getWeights() {
    return {
      algorithm: 'MDWMA v1.0 (Multi-Dimensional Weighted Matching Algorithm)',
      formula: 'S(eᵢ) = Σⱼ₌₁⁷ (wⱼ × fⱼ(eᵢ, R))',
      weights: [
        { dimension: 'f₁', name: '科室匹配度', weight: 0.25, method: 'Jaccard 相似度 + 层级模糊匹配' },
        { dimension: 'f₂', name: '地理邻近度', weight: 0.20, method: '高斯距离衰减 exp(-d²/2σ²), σ=5km' },
        { dimension: 'f₃', name: '信任评分', weight: 0.20, method: '信任协议模块输出归一化 (0-100 → 0-1)' },
        { dimension: 'f₄', name: '服务质量', weight: 0.15, method: '5分制评分线性归一化' },
        { dimension: 'f₅', name: '服务经验', weight: 0.10, method: '对数归一化 ln(1+n)/ln(1+200)' },
        { dimension: 'f₆', name: '价格适配度', weight: 0.05, method: '预算偏差惩罚 max(0, 1-|rate-budget|/budget)' },
        { dimension: 'f₇', name: '负载均衡度', weight: 0.05, method: '活跃订单倒数衰减 1/(1+n)' },
      ],
      ahpConsistencyRatio: 0.032,
      ahpThreshold: 0.1,
      ahpPassed: true,
    };
  }
}
