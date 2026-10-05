import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { assertPublicHttpUrl, OUTBOUND_REQUEST_TIMEOUT_MS } from '../../common/utils/assert-public-url';

@Injectable()
export class NarrativeMedicineService {
  private readonly logger = new Logger(NarrativeMedicineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 基于订单内的多模态数据，调用真实的 MiniMax 大模型接口生成康复备忘录
   */
  async generateRecoveryMemo(orderId: string) {
    this.logger.log(`Generating Recovery Memo for order ${orderId} using actual MiniMax API...`);
    
    // 1. 获取所有存证数据
    const evidences = await this.prisma.digitalEvidence.findMany({
      where: { orderId }
    });
    
    // 更新状态
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'MEMO_GENERATING' }
    });

    // 2. 环境密钥验证
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey || apiKey === 'your_minimax_key_here') {
      throw new HttpException('MiniMax API 密钥尚未配置，请先在 .env 中设置 MINIMAX_API_KEY', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 3. 构建 Prompt
    const evidenceSummary = evidences.length > 0 
      ? evidences.map(e => `[${e.nodeName}] 形式：${e.type}，内容：${e.content || '无详细转写'}`).join('\n')
      : '无特殊事件打卡记录，就诊过程一切顺利。';
      
    const prompt = `你是一个深具同理心的医疗陪诊师兼叙事医学专家。
请根据以下这次在医院的【陪护存证记录】，为患者家属撰写一份100-200字的《康复备忘录》。
语气要求：温暖、专业。既要汇报关键的医嘱情况，又要提供情绪抚慰价值。
陪诊存证记录如下：
${evidenceSummary}`;

    // 4. 调用 MiniMax 接口 (基于通用 OpenAI 兼容接口，兼容 abab6.5s-chat 等模型)
    let generatedContent: string;
    try {
      // 出站 URL 统一校验 + 超时兜底
      const targetUrl = await assertPublicHttpUrl('https://api.minimaxi.com/v1/chat/completions');
      const response = await fetch(targetUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'MiniMax-M2.7',
          messages: [{ role: 'user', content: prompt }],
          reasoning_split: true
        }),
        signal: AbortSignal.timeout(OUTBOUND_REQUEST_TIMEOUT_MS)
      });

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        const msg = data.choices[0].message;
        // 如果推理模型返回了思考过程，可以选做日志记录，这里直接提取最终的正文
        generatedContent = msg.content;
      } else {
        generatedContent = `[API 调用失败] 模型无回包，响应详情：${JSON.stringify(data)}`;
      }
    } catch (err) {
      this.logger.error('Failed to communicate with MiniMax API', err);
      generatedContent = '[系统异常] 大模型网络请求超时或失败。';
    }

    // 5. 产生并保存康复备忘录
    const memo = await this.prisma.recoveryMemo.create({
      data: {
        orderId,
        content: generatedContent,
        aiModel: 'MiniMax-M2.7',
        status: 'published'
      }
    });

    // 完成订单
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' }
    });

    return memo;
  }
}
