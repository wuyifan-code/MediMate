/**
 * MDWMA 算法单元测试 (含 AHP-EWM-TOPSIS 高级管线)
 * 运行: npx ts-node server/src/modules/matching/matching-algorithm.spec.ts
 */
import {
  MatchingAlgorithm,
  EscortFeatureVector,
  MatchingRequest,
  AHPSolver,
  AHP_JUDGMENT_MATRIX,
  EntropyWeightMethod,
  TOPSIS,
  combinedWeights,
  AHP_WEIGHTS,
} from './matching-algorithm';

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
  assert(under.score === 0.75, `低于预算得分 = ${under.score} (期望 0.75)`);

  const over = MatchingAlgorithm.priceScore(100, 80);
  assert(over.score === 0.75, `超出预算得分 = ${over.score} (期望 0.75)`);

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

// ==================== 运行所有测试 ====================

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  MDWMA 多维加权陪护匹配算法 - 完整单元测试          ║');
console.log('║  含 AHP-EWM-TOPSIS 高级决策管线                     ║');
console.log('╚══════════════════════════════════════════════════════╝');

try {
  // 基础评分函数
  testSpecialtyScore();
  testProximityScore();
  testTrustScore();
  testQualityScore();
  testExperienceScore();
  testPriceScore();
  testLoadBalance();

  // 综合排序
  testCompositeRanking();
  testWeightsEndpoint();

  // 高级决策管线
  testAHPSolver();
  testEntropyWeightMethod();
  testCombinedWeights();
  testTOPSIS();
  testRankEscortsAdvanced();

  // 灵敏度分析
  testSensitivityAnalysis();
  testKendallTau();

  // 工具函数
  testHaversine();

  console.log(`\n✅ 所有测试通过！共 ${passCount} 项断言，算法逻辑正确。`);
} catch (e) {
  console.error(`\n❌ 测试失败 (${passCount} 项通过, ${failCount + 1} 项失败): ${e.message}`);
  process.exit(1);
}
