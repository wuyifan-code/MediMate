/**
 * MDWMA 算法单元测试 (含安全约束、鲁棒赋权、共识排序与不确定性分析)
 * 运行: npx ts-node server/src/modules/matching/matching-algorithm.spec.ts
 */
import {
  MatchingAlgorithm,
  EscortFeatureVector,
  MatchingRequest,
  AHPSolver,
  AHP_JUDGMENT_MATRIX,
  EntropyWeightMethod,
  CRITIC,
  TOPSIS,
  VIKOR,
  RankAggregation,
  RobustRankAggregation,
  GameTheoreticWeighting,
  RobustAdaptiveWeighting,
  WeightUncertaintyAnalysis,
  ShapleyValue,
  PROMETHEE,
  GreyRelationalAnalysis,
  ProspectTheory,
  ParetoDominance,
  combinedWeights,
  AHP_WEIGHTS,
} from './matching-algorithm';
import { validateSync } from 'class-validator';
import { MatchingRequestDto } from './dto/matching.dto';

// ==================== 测试数据 ====================

const mockEscorts: EscortFeatureVector[] = [
  {
    id: 'escort-1',
    name: '张护士',
    specialties: ['心内科', '呼吸内科'],
    latitude: 26.647,
    longitude: 106.630,
    trustScore: 92,
    rating: 4.8,
    completedOrders: 156,
    hourlyRate: 80,
    activeOrderCount: 1,
    imageUrl: null,
    bio: '三甲医院退休护士，10年心内科经验',
    isVerified: true,
  },
  {
    id: 'escort-2',
    name: '李陪诊',
    specialties: ['骨科', '普通外科'],
    latitude: 26.650,
    longitude: 106.635,
    trustScore: 78,
    rating: 4.5,
    completedOrders: 89,
    hourlyRate: 60,
    activeOrderCount: 0,
    imageUrl: null,
    bio: '专业骨科陪诊',
    isVerified: true,
  },
  {
    id: 'escort-3',
    name: '王阿姨',
    specialties: ['内科', '中医科'],
    latitude: 26.660,
    longitude: 106.650,
    trustScore: 65,
    rating: 4.2,
    completedOrders: 34,
    hourlyRate: 50,
    activeOrderCount: 3,
    imageUrl: null,
    bio: '耐心细致，擅长老年陪护',
    isVerified: true,
  },
  {
    id: 'escort-4',
    name: '赵师傅',
    specialties: ['儿科', '妇产科'],
    latitude: 26.640,
    longitude: 106.620,
    trustScore: 88,
    rating: 4.9,
    completedOrders: 210,
    hourlyRate: 100,
    activeOrderCount: 0,
    imageUrl: null,
    bio: '金牌陪诊师',
    isVerified: true,
  },
];

const request: MatchingRequest = {
  department: '心内科',
  latitude: 26.648,
  longitude: 106.632,
  budget: 80,
};

// ==================== 测试工具 ====================

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failCount++;
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  passCount++;
  console.log(`  ✓ ${message}`);
}

function assertApprox(actual: number, expected: number, tolerance: number, message: string) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (!ok) {
    failCount++;
    throw new Error(`ASSERTION FAILED: ${message} (actual=${actual}, expected=${expected}, tol=${tolerance})`);
  }
  passCount++;
  console.log(`  ✓ ${message} (actual=${actual})`);
}

// ==================== 基础评分函数测试 ====================

function testSpecialtyScore() {
  console.log('\n=== f₁: 科室匹配度 ===');

  const exact = MatchingAlgorithm.specialtyScore(['心内科', '呼吸内科'], '心内科');
  assert(exact.score === 1.0, `精确匹配得分 = ${exact.score} (期望 1.0)`);

  const parent = MatchingAlgorithm.specialtyScore(['心内科'], '内科');
  assert(parent.score === 0.8, `父级匹配得分 = ${parent.score} (期望 0.8)`);

  const child = MatchingAlgorithm.specialtyScore(['内科'], '心内科');
  assert(child.score === 0.7, `子级匹配得分 = ${child.score} (期望 0.7)`);

  const noMatch = MatchingAlgorithm.specialtyScore(['骨科'], '心内科');
  assert(noMatch.score === 0.0, `无匹配得分 = ${noMatch.score} (期望 0.0)`);

  const empty = MatchingAlgorithm.specialtyScore([], '心内科');
  assert(empty.score === 0.3, `空专长得分 = ${empty.score} (期望 0.3)`);
}

function testProximityScore() {
  console.log('\n=== f₂: 地理邻近度 ===');

  const same = MatchingAlgorithm.proximityScore(26.648, 106.632, 26.648, 106.632);
  assert(same.score === 1.0, `同位置得分 = ${same.score} (期望 1.0)`);

  const near = MatchingAlgorithm.proximityScore(26.647, 106.630, 26.648, 106.632);
  assert(near.score > 0.9, `近距离得分 = ${near.score} (期望 > 0.9)`);

  const far = MatchingAlgorithm.proximityScore(26.700, 106.700, 26.648, 106.632);
  assert(far.score < 0.3, `远距离得分 = ${far.score} (期望 < 0.3)`);

  const noLocation = MatchingAlgorithm.proximityScore(null, null, 26.648, 106.632);
  assert(noLocation.score === 0.2, `无位置得分 = ${noLocation.score} (期望 0.2)`);

  const noTarget = MatchingAlgorithm.proximityScore(26.648, 106.632, undefined, undefined);
  assert(noTarget.score === 0.5, `无目标位置得分 = ${noTarget.score} (期望 0.5)`);
}

function testTrustScore() {
  console.log('\n=== f₃: 信任评分 ===');

  const high = MatchingAlgorithm.trustScore(92);
  assert(high.score === 0.92, `高信任分 = ${high.score} (期望 0.92)`);

  const zero = MatchingAlgorithm.trustScore(0);
  assert(zero.score === 0, `零信任分 = ${zero.score} (期望 0)`);

  const clamp = MatchingAlgorithm.trustScore(120);
  assert(clamp.score === 1.0, `超限信任分截断 = ${clamp.score} (期望 1.0)`);
}

function testQualityScore() {
  console.log('\n=== f₄: 服务质量 ===');

  const high = MatchingAlgorithm.qualityScore(4.8, 100);
  assert(high.score === 0.96, `4.8分得分 = ${high.score} (期望 0.96)`);

  const noOrders = MatchingAlgorithm.qualityScore(0, 0);
  assert(noOrders.score === 0.5, `无订单先验分 = ${noOrders.score} (期望 0.5)`);
}

function testExperienceScore() {
  console.log('\n=== f₅: 服务经验 ===');

  const zero = MatchingAlgorithm.experienceScore(0);
  assert(zero.score === 0, `0单得分 = ${zero.score} (期望 0)`);

  const mid = MatchingAlgorithm.experienceScore(50);
  assert(mid.score > 0.7 && mid.score < 0.8, `50单得分 = ${mid.score} (期望 ~0.74)`);

  const max = MatchingAlgorithm.experienceScore(200);
  assert(max.score === 1.0, `200单得分 = ${max.score} (期望 1.0)`);

  const over = MatchingAlgorithm.experienceScore(500);
  assert(over.score === 1.0, `500单得分 = ${over.score} (期望 1.0, 上限截断)`);
}

function testPriceScore() {
  console.log('\n=== f₆: 价格适配度 ===');

  const exact = MatchingAlgorithm.priceScore(80, 80);
  assert(exact.score === 1.0, `精确预算得分 = ${exact.score} (期望 1.0)`);

  const under = MatchingAlgorithm.priceScore(60, 80);
  assert(under.score === 1, `低于预算不受惩罚 = ${under.score} (期望 1.0)`);

  const over = MatchingAlgorithm.priceScore(100, 80);
  assert(over.score === 0.8, `超出预算按 budget/rate 衰减 = ${over.score} (期望 0.8)`);

  const noBudget = MatchingAlgorithm.priceScore(80, undefined);
  assert(noBudget.score === 0.5, `无预算中性分 = ${noBudget.score} (期望 0.5)`);
}

function testLoadBalance() {
  console.log('\n=== f₇: 负载均衡度 ===');

  const idle = MatchingAlgorithm.loadBalanceScore(0);
  assert(idle.score === 1.0, `空闲得分 = ${idle.score} (期望 1.0)`);

  const one = MatchingAlgorithm.loadBalanceScore(1);
  assert(one.score === 0.5, `1单得分 = ${one.score} (期望 0.5)`);

  const busy = MatchingAlgorithm.loadBalanceScore(4);
  assert(busy.score === 0.2, `4单得分 = ${busy.score} (期望 0.2)`);
}

function testMalformedFeatureSafety() {
  console.log('\n=== 异常特征值安全归一化 ===');
  const malformed: EscortFeatureVector = {
    ...mockEscorts[0],
    latitude: Number.POSITIVE_INFINITY,
    longitude: 999,
    trustScore: Number.NaN,
    rating: Number.POSITIVE_INFINITY,
    completedOrders: -10,
    hourlyRate: Number.NaN,
    activeOrderCount: -3,
  };
  const result = MatchingAlgorithm.computeCompositeScore(malformed, request);

  assert(Number.isFinite(result.compositeScore), '异常输入不会产生 NaN 综合分');
  assert(result.dimensions.every(item => Number.isFinite(item.score) && item.score >= 0 && item.score <= 1), '各维度均被约束在 [0,1]');
  assert(result.hourlyRate === null, '非法价格在输出中归一为空值');
  assert(result.rating === 0 && result.trustScore === 0, '非法评分与信任分归一为 0');
}

function testMatchingRequestValidation() {
  console.log('\n=== 匹配请求 DTO 联动校验 ===');
  const validate = (value: Partial<MatchingRequestDto>) => validateSync(
    Object.assign(new MatchingRequestDto(), value),
  );

  assert(validate({ department: '心内科' }).length === 0, '日期时间均省略时请求有效');
  assert(
    validate({ department: '心内科', appointmentTime: '09:30' })
      .some(error => error.property === 'appointmentDate'),
    '提供时间但缺少日期时拒绝请求',
  );
  assert(
    validate({ department: '心内科', appointmentDate: '2026-07-22', appointmentTime: '09:30', durationHours: 2 }).length === 0,
    '完整日期、时间和时长请求有效',
  );
  assert(
    validate({ department: '心内科', serviceType: 'invalid' as any }).some(error => error.property === 'serviceType'),
    '非法服务类型被枚举校验拒绝',
  );
  assert(
    validate({ department: '心内科', topK: 1.5 }).some(error => error.property === 'topK'),
    '非整数 topK 被拒绝',
  );
}

// ==================== 综合排序测试 ====================

function testCompositeRanking() {
  console.log('\n=== 综合匹配排序 (基础加权求和) ===');

  const results = MatchingAlgorithm.rankEscorts(mockEscorts, request, 4);

  assert(results.length === 4, `返回 ${results.length} 个结果`);
  assert(results[0].escortId === 'escort-1', `Top-1 是张护士 (心内科精确匹配 + 近距离 + 高信任)`);
  assert(results[0].compositeScore > results[1].compositeScore, 'Top-1 分数 > Top-2');

  console.log('\n  排序结果:');
  results.forEach((r, i) => {
    console.log(`  #${i + 1} ${r.name}: ${r.compositeScorePercent}% [${r.matchLevel}] — ${r.summary}`);
  });
}

function testWeightsEndpoint() {
  console.log('\n=== 权重可解释性 ===');

  const result = MatchingAlgorithm.computeCompositeScore(mockEscorts[0], request);
  assert(result.dimensions.length === 7, `7 个维度评分明细`);

  const totalWeighted = result.dimensions.reduce((s, d) => s + d.weightedScore, 0);
  assertApprox(totalWeighted, result.compositeScore, 0.0001, '加权总和 ≈ 综合分');

  console.log('  维度明细:');
  result.dimensions.forEach(d => {
    console.log(`    ${d.label}: ${d.score.toFixed(3)} × ${d.weight} = ${d.weightedScore.toFixed(4)} | ${d.explanation}`);
  });
}

// ==================== AHP 求解器测试 ====================

function testAHPSolver() {
  console.log('\n=== AHP 层次分析法求解器 ===');

  const result = AHPSolver.solve(AHP_JUDGMENT_MATRIX);

  // 权重之和为 1
  const wSum = result.weights.reduce((a, b) => a + b, 0);
  assertApprox(wSum, 1.0, 0.001, `权重之和 = ${wSum.toFixed(4)} (期望 1.0)`);

  // 权重排序: f₁ > f₂ = f₃ > f₄ > f₅ > f₆ = f₇
  assert(result.weights[0] > result.weights[1], `f₁(${result.weights[0]}) > f₂(${result.weights[1]})`);
  assertApprox(result.weights[1], result.weights[2], 0.001, `f₂ ≈ f₃ (对称行)`);
  assert(result.weights[3] > result.weights[4], `f₄(${result.weights[3]}) > f₅(${result.weights[4]})`);
  assertApprox(result.weights[5], result.weights[6], 0.001, `f₆ ≈ f₇ (对称行)`);

  // 与幂法计算值对比 (容差 0.01)
  const expected = [0.3158, 0.1970, 0.1970, 0.1208, 0.0754, 0.0471, 0.0471];
  expected.forEach((exp, i) => {
    assertApprox(result.weights[i], exp, 0.01, `w[${i}] = ${result.weights[i]} (期望 ~${exp})`);
  });

  // 一致性检验
  assert(result.passed === true, `一致性检验通过 (CR = ${result.CR})`);
  assert(result.CR < 0.1, `CR = ${result.CR} < 0.1`);
  assert(result.lambdaMax > 7, `λmax = ${result.lambdaMax} > 7 (n=7)`);
  assert(result.CI >= 0, `CI = ${result.CI} ≥ 0`);

  console.log(`  λmax=${result.lambdaMax}, CI=${result.CI}, RI=${result.RI}, CR=${result.CR}`);
  console.log(`  权重: [${result.weights.join(', ')}]`);
}

// ==================== 熵权法测试 ====================

function testEntropyWeightMethod() {
  console.log('\n=== 熵权法 (EWM) 客观赋权 ===');

  // 用 mock 数据构建决策矩阵
  const { matrix } = MatchingAlgorithm.buildDecisionMatrix(mockEscorts, request);
  assert(matrix.length === 4, `决策矩阵行数 = ${matrix.length} (期望 4)`);
  assert(matrix[0].length === 7, `决策矩阵列数 = ${matrix[0].length} (期望 7)`);

  const ewm = EntropyWeightMethod.solve(matrix);

  // 权重之和为 1
  const wSum = ewm.weights.reduce((a, b) => a + b, 0);
  assertApprox(wSum, 1.0, 0.001, `EWM 权重之和 = ${wSum.toFixed(4)}`);

  // 所有权重非负
  assert(ewm.weights.every(w => w >= 0), '所有 EWM 权重 ≥ 0');

  // 熵值在 [0, 1]
  assert(ewm.entropies.every(e => e >= 0 && e <= 1.0001), `熵值在 [0,1] 范围: [${ewm.entropies.join(', ')}]`);

  // 差异系数 = 1 - 熵
  ewm.diversities.forEach((d, i) => {
    assertApprox(d, 1 - ewm.entropies[i], 0.001, `d[${i}] = 1 - E[${i}]`);
  });

  console.log(`  熵值:   [${ewm.entropies.join(', ')}]`);
  console.log(`  权重:   [${ewm.weights.join(', ')}]`);

  // 单候选退化情况
  const single = EntropyWeightMethod.solve([[0.5, 0.5, 0.5]]);
  assert(single.weights.length === 3, '单候选返回 3 个权重');
  assertApprox(single.weights[0], 1 / 3, 0.001, '单候选均匀权重');
}

// ==================== 组合赋权测试 ====================

function testCombinedWeights() {
  console.log('\n=== 组合赋权 ===');

  const ahp = [0.25, 0.20, 0.20, 0.15, 0.10, 0.05, 0.05];
  const ewm = [0.10, 0.15, 0.20, 0.20, 0.15, 0.10, 0.10];

  // α=1 应退化为纯 AHP
  const pureAhp = combinedWeights(ahp, ewm, 1.0);
  ahp.forEach((w, i) => {
    assertApprox(pureAhp[i], w, 0.001, `α=1: w[${i}] = ${pureAhp[i]} ≈ AHP ${w}`);
  });

  // α=0 应退化为纯 EWM
  const pureEwm = combinedWeights(ahp, ewm, 0.0);
  ewm.forEach((w, i) => {
    assertApprox(pureEwm[i], w, 0.001, `α=0: w[${i}] = ${pureEwm[i]} ≈ EWM ${w}`);
  });

  // α=0.6 组合权重之和为 1
  const combined = combinedWeights(ahp, ewm, 0.6);
  const cSum = combined.reduce((a, b) => a + b, 0);
  assertApprox(cSum, 1.0, 0.001, `组合权重之和 = ${cSum.toFixed(4)}`);

  // 组合权重应在 AHP 和 EWM 之间
  combined.forEach((w, i) => {
    const lo = Math.min(ahp[i], ewm[i]);
    const hi = Math.max(ahp[i], ewm[i]);
    assert(w >= lo - 0.001 && w <= hi + 0.001, `w[${i}]=${w} 在 [${lo}, ${hi}] 之间`);
  });

  console.log(`  组合权重: [${combined.join(', ')}]`);
}

// ==================== TOPSIS 测试 ====================

function testTOPSIS() {
  console.log('\n=== TOPSIS 逼近理想解排序 ===');

  // 简单 3×3 测试矩阵
  const matrix = [
    [0.9, 0.8, 0.7],  // 候选 A: 全面优秀
    [0.5, 0.5, 0.5],  // 候选 B: 中等
    [0.1, 0.2, 0.3],  // 候选 C: 较差
  ];
  const weights = [0.5, 0.3, 0.2];

  const result = TOPSIS.solve(matrix, weights);

  assert(result.closeness.length === 3, `贴近度数组长度 = ${result.closeness.length}`);
  assert(result.ranking.length === 3, `排序数组长度 = ${result.ranking.length}`);

  // 候选 A 应排第一
  assert(result.ranking[0] === 0, `Top-1 是候选 A (索引 0)`);
  // 候选 C 应排最后
  assert(result.ranking[2] === 2, `Top-3 是候选 C (索引 2)`);

  // 贴近度单调递减 (按排序)
  assert(result.closeness[0] > result.closeness[1], `C(A)=${result.closeness[0]} > C(B)=${result.closeness[1]}`);
  assert(result.closeness[1] > result.closeness[2], `C(B)=${result.closeness[1]} > C(C)=${result.closeness[2]}`);

  // 贴近度在 [0, 1]
  result.closeness.forEach((c, i) => {
    assert(c >= 0 && c <= 1, `C[${i}]=${c} ∈ [0,1]`);
  });

  // 距离非负
  result.distanceToIdeal.forEach((d, i) => {
    assert(d >= 0, `D⁺[${i}]=${d} ≥ 0`);
  });
  result.distanceToAntiIdeal.forEach((d, i) => {
    assert(d >= 0, `D⁻[${i}]=${d} ≥ 0`);
  });

  console.log(`  贴近度: [${result.closeness.join(', ')}]`);
  console.log(`  排序:   [${result.ranking.join(', ')}]`);

  // 用实际 mock 数据测试
  const { matrix: realMatrix } = MatchingAlgorithm.buildDecisionMatrix(mockEscorts, request);
  const realWeights = [0.25, 0.20, 0.20, 0.15, 0.10, 0.05, 0.05];
  const realResult = TOPSIS.solve(realMatrix, realWeights);
  assert(realResult.closeness.length === 4, '实际数据: 4 个候选的贴近度');
  console.log(`  实际数据贴近度: [${realResult.closeness.join(', ')}]`);
  console.log(`  实际数据排序:   [${realResult.ranking.join(', ')}]`);
}

// ==================== 高级决策管线测试 ====================

function testRankEscortsAdvanced() {
  console.log('\n=== AHP-EWM-TOPSIS 完整决策管线 ===');

  const { results, meta } = MatchingAlgorithm.rankEscortsAdvanced(mockEscorts, request, 4, 0.6);

  // 基本结构
  assert(results.length === 4, `返回 ${results.length} 个结果`);
  assert(meta.method.includes('AHP-EWM-TOPSIS'), `方法标签: ${meta.method}`);
  assert(meta.alpha === 0.6, `α = ${meta.alpha}`);

  // AHP 元数据
  assert(meta.ahp.passed === true, `AHP 一致性检验通过 (CR=${meta.ahp.CR})`);
  assert(meta.ahp.weights.length === 7, 'AHP 7 维权重');

  // EWM 元数据
  assert(meta.ewm.weights.length === 7, 'EWM 7 维权重');

  // 组合权重
  assert(meta.combinedW.length === 7, '组合权重 7 维');
  const cwSum = meta.combinedW.reduce((a, b) => a + b, 0);
  assertApprox(cwSum, 1.0, 0.001, `组合权重之和 = ${cwSum.toFixed(4)}`);

  // TOPSIS 元数据
  assert(meta.topsis.closeness.length === 4, 'TOPSIS 4 个贴近度');

  // 排序合理性: 张护士 (心内科精确匹配) 应排第一
  assert(results[0].escortId === 'escort-1', `Top-1 是 ${results[0].name} (期望张护士)`);

  // 贴近度应降序
  for (let i = 0; i < results.length - 1; i++) {
    assert(
      results[i].compositeScore >= results[i + 1].compositeScore,
      `#${i + 1}(${results[i].compositeScore}) ≥ #${i + 2}(${results[i + 1].compositeScore})`
    );
  }

  // 维度权重已更新为组合权重
  results[0].dimensions.forEach((d, j) => {
    assertApprox(d.weight, meta.combinedW[j], 0.0001, `维度[${j}]权重 = 组合权重`);
  });

  console.log('\n  高级管线排序结果:');
  results.forEach((r, i) => {
    console.log(`  #${i + 1} ${r.name}: C=${r.compositeScore.toFixed(4)} (${r.compositeScorePercent}%) [${r.matchLevel}]`);
  });
  console.log(`  组合权重: [${meta.combinedW.join(', ')}]`);
}

// ==================== 灵敏度分析测试 ====================

function testSensitivityAnalysis() {
  console.log('\n=== 灵敏度分析 ===');

  const result = MatchingAlgorithm.sensitivityAnalysis(mockEscorts, request, 4, [-0.2, -0.1, 0.1, 0.2]);

  // 基准排序
  assert(result.baseRanking.length === 4, `基准排序 ${result.baseRanking.length} 个`);
  assert(result.baseRanking[0] === 'escort-1', `基准 Top-1 = escort-1`);

  // 扰动数量: 7 维度 × 4 个 delta = 28
  assert(result.perturbations.length === 28, `扰动实验数 = ${result.perturbations.length} (期望 28)`);

  // 每个扰动都有 Kendall's Tau
  result.perturbations.forEach(p => {
    assert(p.kendallTau >= -1 && p.kendallTau <= 1, `${p.dimension} Δ${p.delta}: τ=${p.kendallTau} ∈ [-1,1]`);
  });

  // 稳定性评级
  assert(['high', 'medium', 'low'].includes(result.stability), `稳定性: ${result.stability}`);

  // 打印摘要
  const changed = result.perturbations.filter(p => p.rankChanged).length;
  console.log(`  基准排序: [${result.baseRanking.join(', ')}]`);
  console.log(`  排序变化: ${changed}/${result.perturbations.length} 组`);
  console.log(`  稳定性: ${result.stability}`);

  // 输出部分扰动详情
  console.log('  部分扰动:');
  result.perturbations.slice(0, 4).forEach(p => {
    console.log(`    ${p.dimension} Δ${p.delta > 0 ? '+' : ''}${p.delta}: τ=${p.kendallTau} ${p.rankChanged ? '⚠排序变化' : '✓稳定'}`);
  });
}

// ==================== Kendall's Tau 测试 ====================

function testKendallTau() {
  console.log('\n=== Kendall\'s Tau 排序相关系数 ===');

  // 完全一致
  const tau1 = MatchingAlgorithm.kendallTau(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd']);
  assert(tau1 === 1.0, `完全一致 τ = ${tau1} (期望 1.0)`);

  // 完全相反
  const tau2 = MatchingAlgorithm.kendallTau(['a', 'b', 'c', 'd'], ['d', 'c', 'b', 'a']);
  assert(tau2 === -1.0, `完全相反 τ = ${tau2} (期望 -1.0)`);

  // 部分一致: [a,b,c] vs [a,c,b] → 1 个不一致对 (b,c)
  const tau3 = MatchingAlgorithm.kendallTau(['a', 'b', 'c'], ['a', 'c', 'b']);
  // 3 对中 2 一致 1 不一致 → τ = (2-1)/3 = 1/3
  assertApprox(tau3, 1 / 3, 0.001, `部分一致 τ = ${tau3.toFixed(4)} (期望 1/3)`);

  // 单元素
  const tau4 = MatchingAlgorithm.kendallTau(['a'], ['a']);
  assert(tau4 === 1, `单元素 τ = ${tau4} (期望 1)`);

  // 空数组
  const tau5 = MatchingAlgorithm.kendallTau([], []);
  assert(tau5 === 1, `空数组 τ = ${tau5} (期望 1)`);
}

// ==================== Haversine 距离测试 ====================

function testHaversine() {
  console.log('\n=== Haversine 球面距离 ===');

  // 同一点
  const d0 = MatchingAlgorithm.haversineKm(26.648, 106.632, 26.648, 106.632);
  assertApprox(d0, 0, 0.001, `同一点距离 = ${d0.toFixed(4)} km`);

  // 贵阳到遵义约 130km
  const d1 = MatchingAlgorithm.haversineKm(26.648, 106.632, 27.725, 106.927);
  assert(d1 > 100 && d1 < 160, `贵阳-遵义 ≈ ${d1.toFixed(1)} km (期望 ~130)`);
}

// ==================== 博弈论组合赋权测试 ====================

function testGameTheoreticWeighting() {
  console.log('\n=== 博弈论组合赋权 (Nash 均衡) ===');

  const ahp = [0.3158, 0.1970, 0.1970, 0.1208, 0.0754, 0.0471, 0.0471];
  const ewm = [0.8162, 0.0009, 0.0098, 0.0021, 0.0127, 0.0170, 0.1412];

  const result = GameTheoreticWeighting.solve([ahp, ewm]);

  // 权重之和为 1
  const wSum = result.weights.reduce((a, b) => a + b, 0);
  assertApprox(wSum, 1.0, 0.001, `博弈论权重之和 = ${wSum.toFixed(4)}`);

  // 均衡系数之和为 1
  const alphaSum = result.equilibriumCoefficients.reduce((a, b) => a + b, 0);
  assertApprox(alphaSum, 1.0, 0.001, `均衡系数之和 = ${alphaSum.toFixed(4)}`);

  // 所有权重非负
  assert(result.weights.every(w => w >= 0), '所有博弈论权重 ≥ 0');

  // 迭代应收敛 (通常 < 50 次)
  assert(result.iterations < 100, `收敛迭代次数 = ${result.iterations} < 100`);

  // 偏差非负
  assert(result.deviations.every(d => d >= 0), '偏差非负');

  console.log(`  均衡系数: [${result.equilibriumCoefficients.join(', ')}]`);
  console.log(`  组合权重: [${result.weights.join(', ')}]`);
  console.log(`  偏差:     [${result.deviations.join(', ')}]`);
  console.log(`  迭代次数: ${result.iterations}`);

  // 相同权重输入 → 均衡系数应接近均匀
  const same = GameTheoreticWeighting.solve([ahp, ahp]);
  assertApprox(same.equilibriumCoefficients[0], 0.5, 0.01, '相同输入: α₁ ≈ 0.5');
}

// ==================== VIKOR 测试 ====================

function testVIKOR() {
  console.log('\n=== VIKOR 妥协解排序 ===');

  // 简单 3×3 测试
  const matrix = [
    [0.9, 0.8, 0.7],
    [0.5, 0.5, 0.5],
    [0.1, 0.2, 0.3],
  ];
  const weights = [0.5, 0.3, 0.2];

  const result = VIKOR.solve(matrix, weights, 0.5);

  assert(result.S.length === 3, `S 数组长度 = ${result.S.length}`);
  assert(result.R.length === 3, `R 数组长度 = ${result.R.length}`);
  assert(result.Q.length === 3, `Q 数组长度 = ${result.Q.length}`);
  assert(result.ranking.length === 3, `排序长度 = ${result.ranking.length}`);

  // 候选 A 应排第一 (Q 最小)
  assert(result.ranking[0] === 0, `VIKOR Top-1 是候选 A`);
  // 候选 C 应排最后
  assert(result.ranking[2] === 2, `VIKOR Top-3 是候选 C`);

  // Q 值在 [0, 1]
  result.Q.forEach((q, i) => {
    assert(q >= 0 && q <= 1.0001, `Q[${i}]=${q} ∈ [0,1]`);
  });

  // S, R 非负
  assert(result.S.every(s => s >= 0), 'S 值非负');
  assert(result.R.every(r => r >= 0), 'R 值非负');

  // Q 最优应为 0 (理想解)
  assertApprox(result.Q[result.ranking[0]], 0, 0.001, 'Q 最优 ≈ 0');

  console.log(`  S: [${result.S.join(', ')}]`);
  console.log(`  R: [${result.R.join(', ')}]`);
  console.log(`  Q: [${result.Q.join(', ')}]`);
  console.log(`  排序: [${result.ranking.join(', ')}]`);
  console.log(`  妥协解有效: ${result.compromiseValid} (优势=${result.acceptableAdvantage}, 稳定=${result.acceptableStability})`);

  // 用实际数据测试
  const { matrix: realMatrix } = MatchingAlgorithm.buildDecisionMatrix(mockEscorts, request);
  const realWeights = [0.3158, 0.1970, 0.1970, 0.1208, 0.0754, 0.0471, 0.0471];
  const realVikor = VIKOR.solve(realMatrix, realWeights);
  assert(realVikor.Q.length === 4, '实际数据: 4 个 Q 值');
  console.log(`  实际数据 Q: [${realVikor.Q.join(', ')}]`);
  console.log(`  实际数据排序: [${realVikor.ranking.join(', ')}]`);
}

// ==================== Borda-Copeland 排名聚合测试 ====================

function testRankAggregation() {
  console.log('\n=== Borda-Copeland 排名聚合 ===');

  // 三种方法排序 4 个候选
  const rankings = [
    [0, 1, 2, 3],  // 方法1: A > B > C > D
    [0, 2, 1, 3],  // 方法2: A > C > B > D
    [1, 0, 2, 3],  // 方法3: B > A > C > D
  ];

  const result = RankAggregation.solve(rankings, ['M1', 'M2', 'M3']);

  assert(result.bordaScores.length === 4, 'Borda 分数 4 个');
  assert(result.copelandScores.length === 4, 'Copeland 分数 4 个');
  assert(result.finalRanking.length === 4, '最终排序 4 个');

  // A (索引0) 在 2/3 方法中排第一，应最终排第一
  assert(result.finalRanking[0] === 0, `聚合 Top-1 是候选 A (索引 0)`);

  // D (索引3) 在所有方法中排最后，应最终排最后
  assert(result.finalRanking[3] === 3, `聚合 Top-4 是候选 D (索引 3)`);

  // Borda: A 得 (3+3+2)=8, B 得 (2+1+3)=6, C 得 (1+2+1)=4, D 得 (0+0+0)=0
  assert(result.bordaScores[0] === 8, `Borda(A) = ${result.bordaScores[0]} (期望 8)`);
  assert(result.bordaScores[3] === 0, `Borda(D) = ${result.bordaScores[3]} (期望 0)`);

  console.log(`  Borda:    [${result.bordaScores.join(', ')}]`);
  console.log(`  Copeland: [${result.copelandScores.join(', ')}]`);
  console.log(`  最终排序: [${result.finalRanking.join(', ')}]`);

  // 完全一致时
  const same = RankAggregation.solve([[0, 1, 2], [0, 1, 2], [0, 1, 2]]);
  assert(same.finalRanking[0] === 0 && same.finalRanking[1] === 1 && same.finalRanking[2] === 2, '一致排序保持不变');
}

// ==================== 硬约束预筛选测试 ====================

function testHardConstraints() {
  console.log('\n=== 硬约束预筛选 ===');

  // 添加一个未认证的陪诊师
  const unverifiedEscort: EscortFeatureVector = {
    id: 'escort-unverified',
    name: '未认证者',
    specialties: ['心内科'],
    latitude: 26.648,
    longitude: 106.632,
    trustScore: 95,
    rating: 5.0,
    completedOrders: 300,
    hourlyRate: 50,
    activeOrderCount: 0,
    imageUrl: null,
    bio: '未认证',
    isVerified: false,
  };

  const escortsWithUnverified = [...mockEscorts, unverifiedEscort];
  const { passed, filtered } = MatchingAlgorithm.filterHardConstraints(escortsWithUnverified, request);

  assert(passed.length === 2, `通过筛选: ${passed.length} (期望 2)`);
  assert(filtered.length === 3, `被过滤: ${filtered.length} (期望 3)`);
  assert(filtered.some(item => item.escort.id === 'escort-unverified' && item.reason.includes('认证')), '未认证者被过滤');
  assert(filtered.filter(item => item.reason.includes('科室匹配度')).length === 2, '两个科室不匹配候选被过滤');

  // 认证只是安全条件之一；心内科请求还必须满足科室相关性阈值
  const allPass = MatchingAlgorithm.filterHardConstraints(mockEscorts, request);
  assert(allPass.passed.length === 2, '仅保留心内科精确或父级相关候选');
  assert(allPass.filtered.length === 2, '科室不匹配候选被排除');
  assert(allPass.passed.map(item => item.id).join(',') === 'escort-1,escort-3', '通过候选为张护士和王阿姨');

  console.log(`  通过: ${passed.length}, 过滤: ${filtered.length}`);
}

// ==================== 完整管线测试 (MDWMA) ====================

function testRankEscortsFull() {
  console.log('\n=== MDWMA 完整管线 (安全约束 × 鲁棒赋权 × 5路共识 × SMAA × 基线Shapley) ===');

  const { results, meta } = MatchingAlgorithm.rankEscortsFull(mockEscorts, request, 4);

  // 基本结构
  assert(results.length === 2, `返回 ${results.length} 个安全候选`);
  assert(meta.status === 'ok', `状态: ${meta.status}`);
  assert(meta.method.includes('MDWMA'), `方法: ${meta.method}`);

  // 硬约束
  assert(meta.hardConstraints.total === 4, `总候选: ${meta.hardConstraints.total}`);
  assert(meta.hardConstraints.passed === 2, `通过: ${meta.hardConstraints.passed}`);
  assert(meta.hardConstraints.filtered === 2, `过滤: ${meta.hardConstraints.filtered}`);

  // 现行 MDWMA 鲁棒赋权；旧版博弈论结果仅作为塌缩诊断
  assert(meta.robustWeighting.weights.length === 7, '鲁棒赋权 7 维权重');
  const robustSum = meta.robustWeighting.weights.reduce((a, b) => a + b, 0);
  assertApprox(robustSum, 1.0, 0.001, `鲁棒权重之和 = ${robustSum.toFixed(4)}`);
  assert(meta.robustWeighting.methodCoefficients.every(value => value >= 0.099), '每种赋权来源保留至少 10% 份额');
  assert(Math.max(...meta.robustWeighting.weights) <= 0.450001, '单一准则权重不超过 45%');
  assert(meta.robustWeighting.dataAdequacy < 0.2, '小样本触发客观权重收缩');
  console.log(`  鲁棒来源系数: [${meta.robustWeighting.methodCoefficients.join(', ')}]`);
  console.log(`  鲁棒权重:     [${meta.robustWeighting.weights.join(', ')}]`);

  // VIKOR
  assert(meta.vikor.Q.length === 2, 'VIKOR 2 个 Q 值');
  console.log(`  VIKOR Q: [${meta.vikor.Q.join(', ')}]`);
  console.log(`  VIKOR 妥协解有效: ${meta.vikor.compromiseValid}`);

  // PROMETHEE II
  assert(meta.promethee.netFlows.length === 2, 'PROMETHEE 2 个净流');
  assert(meta.promethee.ranking.length === 2, 'PROMETHEE 排序 2 个');
  console.log(`  PROMETHEE 净流: [${meta.promethee.netFlows.join(', ')}]`);
  console.log(`  PROMETHEE 排序: [${meta.promethee.ranking.join(', ')}]`);

  // GRA
  assert(meta.gra.relationalGrades.length === 2, 'GRA 2 个关联度');
  assert(meta.gra.ranking.length === 2, 'GRA 排序 2 个');
  console.log(`  GRA 关联度: [${meta.gra.relationalGrades.join(', ')}]`);
  console.log(`  GRA 排序:   [${meta.gra.ranking.join(', ')}]`);

  // Shapley
  assert(meta.shapley.shapleyValues.length === 7, 'Shapley 7 维贡献');
  const shapleyAbsSum = meta.shapley.absoluteContributionRatio.reduce((a, b) => a + b, 0);
  assertApprox(shapleyAbsSum, 1.0, 0.01, `Shapley 绝对贡献占比之和 = ${shapleyAbsSum.toFixed(4)}`);
  assertApprox(
    meta.shapley.baseValue + meta.shapley.shapleyValues.reduce((a, b) => a + b, 0),
    meta.shapley.predictionValue,
    0.001,
    '基线值 + Shapley 贡献 = 候选效用',
  );
  console.log(`  Shapley 值: [${meta.shapley.shapleyValues.join(', ')}]`);
  console.log(`  贡献占比:   [${meta.shapley.contributionRatio.join(', ')}]`);

  // 前景理论
  assert(meta.prospectTheory.prospectValues.length === 2, 'PT 2 个前景价值');
  console.log(`  前景价值:   [${meta.prospectTheory.prospectValues.join(', ')}]`);
  console.log(`  PT 排序:    [${meta.prospectTheory.ranking.join(', ')}]`);

  // Pareto
  assert(meta.pareto.top1IsParetoOptimal === true, 'Top-1 是 Pareto 最优');
  assert(meta.pareto.dominatorsOfTop1.length === 0, 'Top-1 无支配者');
  console.log(`  Pareto 前沿: [${meta.pareto.paretoFront.join(', ')}]`);
  console.log(`  Top-1 Pareto 最优: ${meta.pareto.top1IsParetoOptimal}`);

  // 排名聚合 (5路)
  assert(meta.aggregation.finalRanking.length === 2, '聚合排序 2 个');
  assert(meta.aggregation.methodNames.length === 5, '5 路聚合方法');
  assertApprox(meta.aggregation.methodWeights.reduce((a, b) => a + b, 0), 1, 0.001, '聚合方法权重之和为 1');
  assert(meta.aggregation.methodWeights.every(value => value > 0), '所有排序方法保留正权重');
  assert(meta.aggregation.consensusIndex >= 0 && meta.aggregation.consensusIndex <= 1, '共识指数位于 [0,1]');
  console.log(`  WSM 排序:       [${meta.aggregation.inputRankings[0].join(', ')}]`);
  console.log(`  TOPSIS 排序:    [${meta.aggregation.inputRankings[1].join(', ')}]`);
  console.log(`  VIKOR 排序:     [${meta.aggregation.inputRankings[2].join(', ')}]`);
  console.log(`  PROMETHEE 排序: [${meta.aggregation.inputRankings[3].join(', ')}]`);
  console.log(`  GRA 排序:       [${meta.aggregation.inputRankings[4].join(', ')}]`);
  console.log(`  聚合排序:       [${meta.aggregation.finalRanking.join(', ')}]`);
  console.log(`  Borda 分:       [${meta.aggregation.bordaScores.join(', ')}]`);
  console.log(`  Copeland 分:    [${meta.aggregation.copelandScores.join(', ')}]`);

  // 张护士应排第一 (心内科精确匹配)
  assert(results[0].escortId === 'escort-1', `Top-1 是 ${results[0].name} (期望张护士)`);
  assert(results.every(result => Number.isFinite(result.utilityScore)), '结果保留可解释的效用分');
  assert(results.every(result => Number.isFinite(result.consensusScore)), '结果保留共识分');
  assert(results.every(result => Number.isFinite(result.rankConfidence)), '结果保留排名置信度');
  assert(meta.uncertainty.rankAcceptability.length === 2, '输出两名候选的排名可接受度');
  assert(meta.uncertainty.referenceTop1Index === 0, '不确定性分析跟踪最终 Top-1');

  // 分数降序
  for (let i = 0; i < results.length - 1; i++) {
    assert(
      results[i].compositeScore >= results[i + 1].compositeScore,
      `#${i + 1}(${results[i].compositeScore}) ≥ #${i + 2}(${results[i + 1].compositeScore})`
    );
  }

  console.log('\n  MDWMA 排序结果:');
  results.forEach((r, i) => {
    console.log(`  #${i + 1} ${r.name}: ${r.compositeScorePercent}% [${r.matchLevel}] — ${r.summary}`);
  });
}

// ==================== 现行 MDWMA 鲁棒性与安全回归测试 ====================

function testRobustAdaptiveWeighting() {
  console.log('\n=== MDWMA 样本充分度自适应赋权 ===');
  const result = RobustAdaptiveWeighting.solve([
    [0.70, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.70, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.05, 0.70, 0.05, 0.05, 0.05],
  ], 2, { sourceNames: ['AHP', 'EWM', 'CRITIC'], methodFloor: 0.1, criterionCap: 0.45 });

  assertApprox(result.weights.reduce((a, b) => a + b, 0), 1, 0.000001, '鲁棒权重严格归一化');
  assertApprox(result.methodCoefficients.reduce((a, b) => a + b, 0), 1, 0.000001, '来源系数严格归一化');
  assert(result.methodCoefficients.every(value => value >= 0.099), '来源系数不会塌缩为 0');
  assert(Math.max(...result.weights) <= 0.450001, '准则权重执行 45% 上限');
  assert(result.dataAdequacy < 0.2, 'n=2、m=7 被识别为小样本');
  assert(result.adequacyPriorStrength === 2, '样本充分度先验强度默认 κ=2');
  assert(result.warnings.some(item => item.includes('小于 κ×维度数')), '输出带 κ 的小样本风险提示');

  const weakPrior = RobustAdaptiveWeighting.solve([
    [0.70, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.70, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.05, 0.70, 0.05, 0.05, 0.05],
  ], 14, { adequacyPriorStrength: 1 });
  const strongPrior = RobustAdaptiveWeighting.solve([
    [0.70, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.70, 0.05, 0.05, 0.05, 0.05],
    [0.05, 0.05, 0.05, 0.70, 0.05, 0.05, 0.05],
  ], 14, { adequacyPriorStrength: 4 });
  assert(weakPrior.dataAdequacy > strongPrior.dataAdequacy, 'κ 增大时客观权重释放速度单调下降');
  assertApprox(weakPrior.dataAdequacy, 2 / 3, 0.000001, 'κ=1 时 ρ=14/(14+7)');
  assertApprox(strongPrior.dataAdequacy, 1 / 3, 0.000001, 'κ=4 时 ρ=14/(14+28)');
}

function testAuditableDecisionParameters() {
  console.log('\n=== 可审计阈值与最终信号组合 ===');
  const strictSpecialty = MatchingAlgorithm.filterHardConstraints(
    mockEscorts,
    request,
    { minSpecialtyScore: 0.8 },
  );
  assert(strictSpecialty.passed.length === 1, '科室阈值提高到 0.8 后仅保留精确匹配候选');
  assert(strictSpecialty.passed[0].id === 'escort-1', '严格科室阈值下保留张护士');

  const relaxedSpecialty = MatchingAlgorithm.filterHardConstraints(
    mockEscorts,
    request,
    { minSpecialtyScore: 0 },
  );
  assert(relaxedSpecialty.passed.length === 4, '科室阈值降为 0 后四名认证候选均可进入排序');

  const defaultScore = MatchingAlgorithm.combineDecisionSignals(0.8, 0.6, 0.4);
  assertApprox(defaultScore, 0.71, 0.000001, '默认 0.65/0.25/0.10 组合计算正确');
  const normalizedCustom = MatchingAlgorithm.combineDecisionSignals(
    0.8,
    0.6,
    0.4,
    { utility: 6.5, consensus: 2.5, confidence: 1 },
  );
  assertApprox(normalizedCustom, defaultScore, 0.000001, '等比例参数自动归一化且结果不变');
  const clamped = MatchingAlgorithm.combineDecisionSignals(
    2,
    -1,
    Number.NaN,
    { utility: 1, consensus: -1, confidence: 0 },
  );
  assertApprox(clamped, 1, 0.000001, '信号和权重异常值被限制为安全有限得分');
}

function testRobustRankAggregation() {
  console.log('\n=== MDWMA Kendall 可靠度加权共识排序 ===');
  const rankings = [
    [0, 1, 2, 3],
    [0, 2, 1, 3],
    [1, 0, 2, 3],
    [0, 1, 3, 2],
    [3, 2, 1, 0], // 故意加入反向离群排序
  ];
  const result = RobustRankAggregation.solve(rankings, ['A', 'B', 'C', 'D', 'outlier']);

  assert(result.finalRanking[0] === 0, '多数一致意见仍将候选 0 排第一');
  assertApprox(result.methodWeights.reduce((a, b) => a + b, 0), 1, 0.00001, '方法可靠度权重之和为 1');
  assert(result.methodWeights.every(value => value > 0), '离群方法仍保留正权重');
  assert(result.methodWeights[4] < result.methodWeights[0], '反向离群方法权重低于主流方法');
  assert(result.consensusScores.every(value => value >= 0 && value <= 1), '候选共识分位于 [0,1]');
  assert(result.consensusIndex >= 0 && result.consensusIndex <= 1, '总体共识指数位于 [0,1]');
}

function testWeightUncertainty() {
  console.log('\n=== MDWMA SMAA 风格权重不确定性 ===');
  const matrix = [
    [0.95, 0.80, 0.90],
    [0.80, 0.95, 0.75],
    [0.65, 0.70, 0.98],
  ];
  const options = { iterations: 256, noiseLevel: 0.2, seed: 42 };
  const first = WeightUncertaintyAnalysis.solve(matrix, [0.5, 0.3, 0.2], options);
  const second = WeightUncertaintyAnalysis.solve(matrix, [0.5, 0.3, 0.2], options);

  assert(JSON.stringify(first) === JSON.stringify(second), '固定种子的分析结果完全可复现');
  first.rankAcceptability.forEach((row, index) => {
    assertApprox(row.reduce((a, b) => a + b, 0), 1, 0.00001, `候选 ${index} 各名次概率之和为 1`);
  });
  assertApprox(first.firstRankAcceptability.reduce((a, b) => a + b, 0), 1, 0.00001, '第一名概率在候选间守恒');
  assert(first.meanKendallTau >= -1 && first.meanKendallTau <= 1, '平均 Kendall τ 位于 [-1,1]');
  assert(first.referenceTop1Confidence === first.firstRankAcceptability[first.referenceTop1Index], 'Top-1 置信度来自第一名可接受度');
}

function testBaselineShapley() {
  console.log('\n=== MDWMA 均值基线 Shapley 解释 ===');
  const { matrix } = MatchingAlgorithm.buildDecisionMatrix(mockEscorts, request);
  const weights = Object.values(AHP_WEIGHTS);
  const result = ShapleyValue.solve(matrix, weights, 1, 'mean');

  assert(result.shapleyValues.some(value => value < 0), '弱于群体均值的维度呈现负贡献');
  assertApprox(
    result.baseValue + result.shapleyValues.reduce((a, b) => a + b, 0),
    result.predictionValue,
    0.001,
    '均值基线解释满足局部准确性',
  );
  assertApprox(result.absoluteContributionRatio.reduce((a, b) => a + b, 0), 1, 0.001, '绝对贡献比例之和为 1');
  assert(Math.abs(result.residual) <= 0.001, `解释残差接近 0 (${result.residual})`);
}

function testAvailabilityConstraints() {
  console.log('\n=== MDWMA 服务类型与预约时段硬约束 ===');
  const commonAvailability = {
    serviceType: 'hospital_accompaniment',
    startDate: '2026-07-01',
    endDate: '2026-08-31',
    availableWeekdays: [3], // 2026-07-22 为周三
    maxDailyOrders: 2,
    bookingsOnDate: 1,
    pricePerHour: 80,
    hospitalIds: ['hospital-a'],
  };
  const available: EscortFeatureVector = {
    ...mockEscorts[0],
    id: 'available',
    availableServices: [
      {
        ...commonAvailability,
        serviceId: 'service-standard',
        timeSlots: [{ start: '08:00', end: '12:00' }],
        bookedTimeSlots: [{ start: '09:00', end: '10:00' }],
      },
      {
        ...commonAvailability,
        serviceId: 'service-economy',
        pricePerHour: 60,
        timeSlots: [{ start: '08:00', end: '12:00' }],
        bookedTimeSlots: [{ start: '09:00', end: '10:00' }],
      },
    ],
  };
  const booked: EscortFeatureVector = {
    ...mockEscorts[0],
    id: 'booked',
    availableServices: [{
      ...commonAvailability,
      serviceId: 'service-booked',
      timeSlots: [{ start: '08:00', end: '12:00' }],
      bookedTimeSlots: [{ start: '10:00', end: '11:00' }],
    }],
  };
  const wrongService: EscortFeatureVector = {
    ...mockEscorts[0],
    id: 'wrong-service',
    availableServices: [{
      ...commonAvailability,
      serviceId: 'service-wrong-type',
      serviceType: 'home_care',
      timeSlots: [{ start: '08:00', end: '12:00' }],
    }],
  };
  const missingSlots: EscortFeatureVector = {
    ...mockEscorts[0],
    id: 'missing-slots',
    availableServices: [{
      ...commonAvailability,
      serviceId: 'service-missing-slots',
      timeSlots: [],
    }],
  };
  const wrongHospital: EscortFeatureVector = {
    ...mockEscorts[0],
    id: 'wrong-hospital',
    availableServices: [{
      ...commonAvailability,
      serviceId: 'service-wrong-hospital',
      hospitalIds: ['hospital-b'],
      timeSlots: [{ start: '08:00', end: '12:00' }],
    }],
  };
  const timedRequest: MatchingRequest = {
    ...request,
    serviceType: 'hospital_accompaniment',
    hospitalId: 'hospital-a',
    appointmentDate: '2026-07-22',
    appointmentTime: '10:30',
    durationHours: 1,
  };
  const filtered = MatchingAlgorithm.filterHardConstraints(
    [available, booked, wrongService, missingSlots, wrongHospital],
    timedRequest,
  );

  assert(filtered.passed.length === 1 && filtered.passed[0].id === 'available', '仅保留类型、日期和时间均可用的候选');
  assert(filtered.passed[0].hourlyRate === 60, '使用实际可用服务中的最低发布价格评分');
  assert(filtered.passed[0].matchedServiceId === 'service-economy', '返回本次匹配选中的服务 ID');
  assert(filtered.filtered.length === 4, '冲突时段、错误服务类型、空发布时段和医院范围不符均被过滤');
  assert(filtered.filtered.every(item => item.reason.includes('不可用')), '可用性过滤原因可追溯');
  assert(filtered.filtered.some(item => item.escort.id === 'wrong-hospital'), '服务医院覆盖范围硬约束生效');

  const outsideFullInterval = MatchingAlgorithm.filterHardConstraints([available], {
    ...timedRequest,
    appointmentTime: '11:30',
    durationHours: 1,
  });
  assert(outsideFullInterval.passed.length === 0, '完整服务区间越过发布时段终点时被过滤');

  const boundaryNonConflict = MatchingAlgorithm.filterHardConstraints([available], {
    ...timedRequest,
    appointmentTime: '10:00',
    durationHours: 2,
  });
  assert(boundaryNonConflict.passed.length === 1, '预约恰在既有时段结束时开始不构成重叠');

  const uncovered = { ...mockEscorts[0], id: 'legacy-no-availability', availableServices: undefined };
  const failClosed = MatchingAlgorithm.filterHardConstraints([uncovered], timedRequest);
  assert(failClosed.passed.length === 0 && failClosed.filtered.length === 1, '请求携带服务字段而可用性数据缺失时按 fail-closed 排除');
  assert(failClosed.filtered[0].reason.includes('转人工复核'), 'fail-closed 排除原因标记转人工复核');
  const uncoveredDecision = MatchingAlgorithm.rankEscortsFull([uncovered], timedRequest);
  assert(uncoveredDecision.results.length === 0 && uncoveredDecision.meta.status === 'no_candidates', '可用性数据缺失候选不被自动推荐');
  assert(uncoveredDecision.meta.warnings.some(item => item.includes('缺少发布服务可用性数据')), 'fail-closed 排除同时输出数据覆盖告警');
}

function testNoUnsafeFallbackAndEdgeCases() {
  console.log('\n=== MDWMA 无不安全回退与边界输入 ===');
  const unverified = { ...mockEscorts[0], id: 'unsafe', isVerified: false };
  const none = MatchingAlgorithm.rankEscortsFull([unverified], request);
  assert(none.results.length === 0, '全部不合格时返回空结果，不回放原候选');
  assert(none.meta.status === 'no_candidates', '全部不合格时状态为 no_candidates');
  assert(none.meta.hardConstraints.filtered === 1, '不合格原因进入元数据');

  const empty = MatchingAlgorithm.rankEscortsFull([], request);
  assert(empty.results.length === 0 && empty.meta.status === 'no_candidates', '空候选输入安全返回');

  const single = MatchingAlgorithm.rankEscortsFull([mockEscorts[0]], request);
  assert(single.results.length === 1 && single.meta.status === 'ok', '单候选输入可完成完整管线');
  assert(Number.isFinite(single.results[0].compositeScore), '单候选综合分为有限数值');
  assert(single.meta.pareto.top1IsParetoOptimal, '单候选属于 Pareto 前沿');
}

// ==================== CRITIC 客观赋权测试 ====================

function testCRITIC() {
  console.log('\n=== CRITIC 客观赋权 (对比强度×冲突度) ===');

  const { matrix } = MatchingAlgorithm.buildDecisionMatrix(mockEscorts, request);
  const result = CRITIC.solve(matrix);

  // 权重之和为 1
  const wSum = result.weights.reduce((a, b) => a + b, 0);
  assertApprox(wSum, 1.0, 0.001, `CRITIC 权重之和 = ${wSum.toFixed(4)}`);

  // 所有权重非负
  assert(result.weights.every(w => w >= 0), '所有 CRITIC 权重 ≥ 0');

  // 标准差非负
  assert(result.stdDeviations.every(s => s >= 0), '标准差非负');

  // 相关系数矩阵对称且对角线为 1
  for (let j = 0; j < 7; j++) {
    assertApprox(result.correlationMatrix[j][j], 1, 0.001, `r[${j}][${j}] = 1`);
    for (let k = j + 1; k < 7; k++) {
      assertApprox(result.correlationMatrix[j][k], result.correlationMatrix[k][j], 0.001, `r[${j}][${k}] = r[${k}][${j}]`);
    }
  }

  // 冲突度非负
  assert(result.conflicts.every(c => c >= 0), '冲突度非负');

  // 信息量非负
  assert(result.informationAmounts.every(i => i >= 0), '信息量非负');

  console.log(`  标准差: [${result.stdDeviations.join(', ')}]`);
  console.log(`  冲突度: [${result.conflicts.join(', ')}]`);
  console.log(`  权重:   [${result.weights.join(', ')}]`);
  console.log(`  相关系数矩阵 (部分):`);
  console.log(`    r(科室,信任) = ${result.correlationMatrix[0][2]}`);
  console.log(`    r(信任,质量) = ${result.correlationMatrix[2][3]}`);
  console.log(`    r(经验,负载) = ${result.correlationMatrix[4][6]}`);
}

// ==================== Monte Carlo 灵敏度模拟测试 ====================

function testMonteCarloSensitivity() {
  console.log('\n=== Monte Carlo 灵敏度模拟 (1000次) ===');

  const result = MatchingAlgorithm.monteCarloSensitivity(mockEscorts, request, {
    iterations: 1000,
    noiseLevel: 0.15,
    topK: 4,
  });

  // Top-1 稳定性应很高 (张护士优势明显)
  assert(result.top1Stability > 0.9, `Top-1 稳定性 = ${(result.top1Stability * 100).toFixed(1)}% > 90%`);

  // 平均 Kendall's Tau 应较高
  assert(result.avgKendallTau > 0.7, `平均 τ = ${result.avgKendallTau} > 0.7`);

  // Top-1 频率之和为 1
  const freqSum = Object.values(result.top1Frequency).reduce((a, b) => a + b, 0);
  assertApprox(freqSum, 1.0, 0.01, `Top-1 频率之和 = ${freqSum.toFixed(4)}`);

  // escort-1 应是最高频 Top-1
  assert(result.top1Frequency['escort-1'] > 0.5, `escort-1 Top-1 频率 = ${(result.top1Frequency['escort-1'] * 100).toFixed(1)}%`);

  // 平均排名: escort-1 应最小
  assert(result.avgRank['escort-1'] < result.avgRank['escort-2'], 'escort-1 平均排名 < escort-2');

  console.log(`  Top-1 稳定性: ${(result.top1Stability * 100).toFixed(1)}%`);
  console.log(`  Top-K 稳定性: ${(result.topKStability * 100).toFixed(1)}%`);
  console.log(`  平均 τ: ${result.avgKendallTau}`);
  console.log(`  Top-1 频率: ${JSON.stringify(result.top1Frequency)}`);
  console.log(`  平均排名: ${JSON.stringify(result.avgRank)}`);
}

// ==================== MMR 公平性重排测试 ====================

function testMMRRerank() {
  console.log('\n=== MMR 公平性重排 ===');

  const baseResults = MatchingAlgorithm.rankEscorts(mockEscorts, request, 4);

  // λ=1 应退化为原始排序
  const pureScore = MatchingAlgorithm.mmrRerank(baseResults, mockEscorts, 1.0);
  assert(pureScore[0].escortId === baseResults[0].escortId, 'λ=1: Top-1 不变');

  // λ=0.7 重排
  const mmrResults = MatchingAlgorithm.mmrRerank(baseResults, mockEscorts, 0.7);
  assert(mmrResults.length === 4, `MMR 返回 ${mmrResults.length} 个结果`);

  // Top-1 应保持不变 (张护士优势太大)
  assert(mmrResults[0].escortId === 'escort-1', `MMR Top-1 = ${mmrResults[0].name}`);

  // 所有结果都应存在 (不丢失)
  const ids = new Set(mmrResults.map(r => r.escortId));
  assert(ids.size === 4, 'MMR 不丢失候选');

  console.log('  原始排序 vs MMR (λ=0.7):');
  baseResults.forEach((r, i) => {
    const mmrIdx = mmrResults.findIndex(m => m.escortId === r.escortId);
    const shift = mmrIdx - i;
    console.log(`  ${r.name}: #${i + 1} → #${mmrIdx + 1} ${shift > 0 ? '↓' + shift : shift < 0 ? '↑' + Math.abs(shift) : '='}`);
  });

  // λ=0 最大多样性: 第一个仍是最高分，后续应尽量选择不同的
  const maxDiversity = MatchingAlgorithm.mmrRerank(baseResults, mockEscorts, 0.0);
  assert(maxDiversity.length === 4, 'λ=0 返回完整列表');
  console.log(`  λ=0 排序: [${maxDiversity.map(r => r.name).join(', ')}]`);
}

// ==================== Shapley Value 维度贡献测试 ====================

function testShapleyValue() {
  console.log('\n=== Shapley Value 维度贡献分解 (合作博弈论) ===');

  const { matrix } = MatchingAlgorithm.buildDecisionMatrix(mockEscorts, request);
  const weights = [0.3158, 0.197, 0.197, 0.1208, 0.0754, 0.0471, 0.0471];

  // 对 Top-1 候选 (张护士, row 0) 计算 Shapley 值
  const result = ShapleyValue.solve(matrix, weights, 0);

  // Shapley 值之和 = 大联盟价值 (效率性公理)
  const phiSum = result.shapleyValues.reduce((a, b) => a + b, 0);
  assertApprox(phiSum, result.grandCoalitionValue, 0.001, `Σφᵢ = v(N) = ${phiSum.toFixed(4)}`);

  // 所有 Shapley 值非负 (得分和权重都非负)
  assert(result.shapleyValues.every(v => v >= 0), '所有 Shapley 值 ≥ 0');

  // 贡献占比之和 = 1
  const ratioSum = result.contributionRatio.reduce((a, b) => a + b, 0);
  assertApprox(ratioSum, 1.0, 0.01, `贡献占比之和 = ${ratioSum.toFixed(4)}`);

  // 科室匹配贡献应最大 (权重最高 × 得分=1)
  assert(result.shapleyValues[0] > result.shapleyValues[1], 'φ(科室) > φ(邻近)');

  // 7 个维度
  assert(result.shapleyValues.length === 7, '7 维 Shapley 值');
  assert(result.dimensions.length === 7, '7 个维度标签');

  console.log(`  大联盟价值 v(N) = ${result.grandCoalitionValue}`);
  console.log(`  Shapley 值: [${result.shapleyValues.join(', ')}]`);
  console.log(`  贡献占比:   [${result.contributionRatio.join(', ')}]`);
  console.log(`  维度:       [${result.dimensions.join(', ')}]`);

  // 群体 Shapley 值
  const groupResult = ShapleyValue.solveGroup(matrix, weights);
  assert(groupResult.shapleyValues.length === 7, '群体 Shapley 7 维');
  const groupSum = groupResult.contributionRatio.reduce((a, b) => a + b, 0);
  assertApprox(groupSum, 1.0, 0.01, `群体贡献占比之和 = ${groupSum.toFixed(4)}`);
  console.log(`  群体 Shapley: [${groupResult.shapleyValues.join(', ')}]`);
}

// ==================== PROMETHEE II 测试 ====================

function testPROMETHEE() {
  console.log('\n=== PROMETHEE II 超越关系排序 ===');

  const { matrix } = MatchingAlgorithm.buildDecisionMatrix(mockEscorts, request);
  const weights = [0.3158, 0.197, 0.197, 0.1208, 0.0754, 0.0471, 0.0471];

  const result = PROMETHEE.solve(matrix, weights);

  // 4 个候选
  assert(result.netFlows.length === 4, '4 个净超越流');
  assert(result.positiveFlows.length === 4, '4 个离开流');
  assert(result.negativeFlows.length === 4, '4 个进入流');
  assert(result.ranking.length === 4, '排序 4 个');

  // 净流 = 离开流 - 进入流
  for (let i = 0; i < 4; i++) {
    assertApprox(result.netFlows[i], result.positiveFlows[i] - result.negativeFlows[i], 0.001,
      `Φ[${i}] = Φ⁺[${i}] - Φ⁻[${i}]`);
  }

  // Top-1 应是张护士 (索引 0)
  assert(result.ranking[0] === 0, `PROMETHEE Top-1 是候选 0 (张护士)`);

  // Top-1 净流最大
  assert(result.netFlows[0] > result.netFlows[1], 'Φ(张) > Φ(王)');

  // σ 参数非负
  assert(result.sigmas.every(s => s > 0), '所有 σ > 0');

  console.log(`  净超越流: [${result.netFlows.join(', ')}]`);
  console.log(`  离开流:   [${result.positiveFlows.join(', ')}]`);
  console.log(`  进入流:   [${result.negativeFlows.join(', ')}]`);
  console.log(`  排序:     [${result.ranking.join(', ')}]`);
  console.log(`  σ 参数:   [${result.sigmas.join(', ')}]`);
}

// ==================== 灰色关联分析测试 ====================

function testGRA() {
  console.log('\n=== 灰色关联分析 GRA (邓聚龙, ρ=0.5) ===');

  const { matrix } = MatchingAlgorithm.buildDecisionMatrix(mockEscorts, request);
  const weights = [0.3158, 0.197, 0.197, 0.1208, 0.0754, 0.0471, 0.0471];

  const result = GreyRelationalAnalysis.solve(matrix, weights);

  // 4 个候选
  assert(result.relationalGrades.length === 4, '4 个关联度');
  assert(result.coefficients.length === 4, '4 行关联系数');
  assert(result.coefficients[0].length === 7, '7 列关联系数');
  assert(result.ranking.length === 4, '排序 4 个');

  // 关联系数在 (0, 1] 范围
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 7; j++) {
      assert(result.coefficients[i][j] > 0 && result.coefficients[i][j] <= 1,
        `ξ[${i}][${j}] = ${result.coefficients[i][j]} ∈ (0,1]`);
    }
  }

  // 关联度在 (0, 1] 范围
  assert(result.relationalGrades.every(g => g > 0 && g <= 1), '关联度 ∈ (0,1]');

  // Top-1 应是张护士
  assert(result.ranking[0] === 0, 'GRA Top-1 是候选 0 (张护士)');

  // 张护士关联度最高 (所有维度接近理想值)
  assert(result.relationalGrades[0] > result.relationalGrades[1], 'r(张) > r(王)');

  // 参考序列 = 各维度最大值
  assert(result.referenceSequence.length === 7, '参考序列 7 维');
  assert(result.referenceSequence[0] === 1, '参考序列[0] = 1 (科室匹配最大值)');

  // ρ = 0.5
  assert(result.rho === 0.5, `ρ = ${result.rho}`);

  // Δmin ≥ 0, Δmax > 0
  assert(result.deltaMin >= 0, `Δmin = ${result.deltaMin} ≥ 0`);
  assert(result.deltaMax > 0, `Δmax = ${result.deltaMax} > 0`);

  console.log(`  关联度:   [${result.relationalGrades.join(', ')}]`);
  console.log(`  排序:     [${result.ranking.join(', ')}]`);
  console.log(`  参考序列: [${result.referenceSequence.join(', ')}]`);
  console.log(`  Δmin=${result.deltaMin}, Δmax=${result.deltaMax}, ρ=${result.rho}`);
}

// ==================== 前景理论测试 ====================

function testProspectTheory() {
  console.log('\n=== 前景理论价值函数 (Kahneman-Tversky) ===');

  const { matrix } = MatchingAlgorithm.buildDecisionMatrix(mockEscorts, request);
  const weights = [0.3158, 0.197, 0.197, 0.1208, 0.0754, 0.0471, 0.0471];

  const result = ProspectTheory.solve(matrix, weights);

  // 4 个候选
  assert(result.prospectValues.length === 4, '4 个前景价值');
  assert(result.valueMatrix.length === 4, '4 行价值矩阵');
  assert(result.valueMatrix[0].length === 7, '7 列价值矩阵');
  assert(result.ranking.length === 4, '排序 4 个');

  // 参数验证
  assert(result.params.alpha === 0.88, `α = ${result.params.alpha}`);
  assert(result.params.beta === 0.88, `β = ${result.params.beta}`);
  assert(result.params.lambda === 2.25, `λ = ${result.params.lambda}`);

  // 参考点 = 各维度均值
  assert(result.referencePoints.length === 7, '7 个参考点');

  // 价值函数性质验证
  // v(0) = 0
  assertApprox(ProspectTheory.valueFunction(0), 0, 0.001, 'v(0) = 0');
  // 损失厌恶: |v(-x)| > v(x) for x > 0
  const gain = ProspectTheory.valueFunction(0.3);
  const loss = ProspectTheory.valueFunction(-0.3);
  assert(Math.abs(loss) > gain, `|v(-0.3)| = ${Math.abs(loss).toFixed(4)} > v(0.3) = ${gain.toFixed(4)} (损失厌恶)`);
  // 敏感度递减: v(0.1) - v(0) > v(0.9) - v(0.8)
  const marginal1 = ProspectTheory.valueFunction(0.1) - ProspectTheory.valueFunction(0);
  const marginal2 = ProspectTheory.valueFunction(0.9) - ProspectTheory.valueFunction(0.8);
  assert(marginal1 > marginal2, '收益域敏感度递减');

  // Top-1 应是张护士 (远超均值 → 全维度正收益)
  assert(result.ranking[0] === 0, 'PT Top-1 是候选 0 (张护士)');

  // 张护士前景价值应为正 (全面超越参考点)
  assert(result.prospectValues[0] > 0, `张护士前景价值 = ${result.prospectValues[0]} > 0`);

  console.log(`  前景价值: [${result.prospectValues.join(', ')}]`);
  console.log(`  排序:     [${result.ranking.join(', ')}]`);
  console.log(`  参考点:   [${result.referencePoints.join(', ')}]`);
  console.log(`  参数: α=${result.params.alpha}, β=${result.params.beta}, λ=${result.params.lambda}`);
  console.log(`  损失厌恶验证: |v(-0.3)|=${Math.abs(loss).toFixed(4)} > v(0.3)=${gain.toFixed(4)} ✓`);
}

// ==================== Pareto 支配测试 ====================

function testParetoDominance() {
  console.log('\n=== Pareto 支配与最优性验证 ===');

  const { matrix } = MatchingAlgorithm.buildDecisionMatrix(mockEscorts, request);

  const result = ParetoDominance.solve(matrix, 0);

  // 基本结构
  assert(result.isParetoOptimal.length === 4, '4 个 Pareto 判定');
  assert(result.dominanceMatrix.length === 4, '4×4 支配矩阵');
  assert(result.dominanceMatrix[0].length === 4, '支配矩阵列数');

  // 对角线为 false (不自我支配)
  for (let i = 0; i < 4; i++) {
    assert(result.dominanceMatrix[i][i] === false, `dominance[${i}][${i}] = false`);
  }

  // 张护士 (row 0) 应是 Pareto 最优 (科室=1, 邻近≈1, 信任=0.92 全面领先)
  assert(result.top1IsParetoOptimal === true, '张护士是 Pareto 最优');
  assert(result.dominatorsOfTop1.length === 0, '无候选支配张护士');

  // Pareto 前沿非空
  assert(result.paretoFront.length >= 1, `Pareto 前沿 ≥ 1 个解`);
  assert(result.paretoFront.includes(0), '张护士在 Pareto 前沿中');
  assert(result.paretoLayers.length >= 1, '输出非支配分层');
  assert(result.dominanceDepth.length === 4, '每个候选都有 Pareto 层级');
  assert(result.paretoFront.every(index => result.dominanceDepth[index] === 0), '第一前沿候选层级为 0');

  // 支配关系反对称: 若 i 支配 j, 则 j 不支配 i
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (result.dominanceMatrix[i][j]) {
        assert(result.dominanceMatrix[j][i] === false, `dom[${i}][${j}]=T → dom[${j}][${i}]=F`);
      }
    }
  }

  console.log(`  Pareto 前沿: [${result.paretoFront.join(', ')}]`);
  console.log(`  Pareto 最优: [${result.isParetoOptimal.join(', ')}]`);
  console.log(`  Top-1 Pareto 最优: ${result.top1IsParetoOptimal}`);
  console.log(`  支配 Top-1 的候选: [${result.dominatorsOfTop1.join(', ')}]`);

  // 构造一个被支配的案例验证
  const dominatedMatrix = [
    [0.9, 0.8, 0.9, 0.9, 0.9, 0.9, 0.9], // A: 强势但邻近度一般
    [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], // B: 被 A 支配
    [0.8, 0.95, 0.7, 0.7, 0.6, 0.8, 0.4], // C: 邻近度超越 A, 不被支配
  ];
  const domResult = ParetoDominance.solve(dominatedMatrix, 1);
  assert(domResult.top1IsParetoOptimal === false, 'B 不是 Pareto 最优');
  assert(domResult.dominatorsOfTop1.includes(0), 'A 支配 B');
  assert(domResult.paretoFront.includes(0), 'A 在前沿');
  assert(domResult.paretoFront.includes(2), 'C 在前沿 (邻近度超越 A)');
  assert(!domResult.paretoFront.includes(1), 'B 不在前沿');
  assert(domResult.dominanceDepth[1] > 0, '被支配候选进入更深 Pareto 层');
  console.log(`  验证案例: B 被 A 支配 ✓, Pareto 前沿 = [A, C] ✓`);
}

// ==================== 运行所有测试 ====================

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  MDWMA 多维加权陪护匹配算法 - 完整单元测试              ║');
console.log('║  安全约束 × 鲁棒赋权 × 5路共识 × SMAA × 可解释性       ║');
console.log('╚══════════════════════════════════════════════════════════╝');

try {
  // 基础评分函数
  testSpecialtyScore();
  testProximityScore();
  testTrustScore();
  testQualityScore();
  testExperienceScore();
  testPriceScore();
  testLoadBalance();
  testMalformedFeatureSafety();
  testMatchingRequestValidation();

  // 综合排序
  testCompositeRanking();
  testWeightsEndpoint();

  // 高级决策管线
  testAHPSolver();
  testEntropyWeightMethod();
  testCombinedWeights();
  testGameTheoreticWeighting();
  testTOPSIS();
  testVIKOR();
  testRankAggregation();
  testRankEscortsAdvanced();

  // 硬约束 + 完整管线
  testHardConstraints();
  testRankEscortsFull();
  testRobustAdaptiveWeighting();
  testAuditableDecisionParameters();
  testRobustRankAggregation();
  testWeightUncertainty();
  testBaselineShapley();
  testAvailabilityConstraints();
  testNoUnsafeFallbackAndEdgeCases();

  // 灵敏度分析
  testSensitivityAnalysis();
  testKendallTau();

  // CRITIC + Monte Carlo + MMR
  testCRITIC();
  testMonteCarloSensitivity();
  testMMRRerank();

  // 可解释性 + PROMETHEE + GRA + 前景理论 + Pareto
  testShapleyValue();
  testPROMETHEE();
  testGRA();
  testProspectTheory();
  testParetoDominance();

  // 工具函数
  testHaversine();

  console.log(`\n✅ 所有测试通过！共 ${passCount} 项断言，算法逻辑正确。`);
} catch (e: any) {
  console.error(`\n❌ 测试失败 (${passCount} 项通过, ${failCount + 1} 项失败): ${e.message}`);
  process.exit(1);
}
