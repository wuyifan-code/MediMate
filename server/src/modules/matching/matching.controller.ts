import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { MatchingRequestDto } from './dto/matching.dto';
import { AHPSolver, AHP_JUDGMENT_MATRIX } from './matching-algorithm';

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
    description: '返回 MDWMA 的 AHP 先验权重及动态赋权说明。实际权重会根据候选集 EWM/CRITIC 结果自适应调整。',
  })
  getWeights() {
    const ahp = AHPSolver.solve(AHP_JUDGMENT_MATRIX);
    const definitions = [
      { dimension: 'f₁', name: '科室匹配度', method: '精确匹配 + 层级模糊匹配' },
      { dimension: 'f₂', name: '地理邻近度', method: '高斯距离衰减 exp(-d²/2σ²), σ=5km' },
      { dimension: 'f₃', name: '信任评分', method: '信任协议模块输出归一化 (0-100 → 0-1)' },
      { dimension: 'f₄', name: '服务质量', method: '5分制评分线性归一化' },
      { dimension: 'f₅', name: '服务经验', method: '对数归一化 ln(1+n)/ln(1+200)' },
      { dimension: 'f₆', name: '价格适配度', method: '非对称可负担性：预算内=1，超预算=budget/rate' },
      { dimension: 'f₇', name: '负载均衡度', method: '活跃订单倒数衰减 1/(1+n)' },
    ];
    return {
      algorithm: 'MDWMA (Constrained Robust Consensus)',
      formula: 'RobustScore = 0.65·Utility + 0.25·Consensus + 0.10·RankAcceptability',
      priorWeights: definitions.map((definition, index) => ({
        ...definition,
        weight: ahp.weights[index],
      })),
      dynamicWeighting: 'AHP prior + EWM + CRITIC, with n/(n+2m) small-sample shrinkage and 0.45 criterion cap',
      ahpConsistencyRatio: ahp.CR,
      ahpThreshold: 0.1,
      ahpPassed: ahp.passed,
    };
  }
}
