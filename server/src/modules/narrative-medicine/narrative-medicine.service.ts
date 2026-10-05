import { Injectable, Logger, HttpException, HttpStatus, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { assertPublicHttpUrl, OUTBOUND_REQUEST_TIMEOUT_MS } from '../../common/utils/assert-public-url';

@Injectable()
export class NarrativeMedicineService {
  private readonly logger = new Logger(NarrativeMedicineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 基于订单内的多模态数据，调用真实的 MiniMax 大模型接口生成康复备忘录
   */
  async generateRecoveryMemo(orderId: string, requesterId: string) {
    this.logger.log(`Generating Recovery Memo for order ${orderId} using actual MiniMax API...`);
    
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { patientId: true, escortId: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.patientId !== requesterId && order.escortId !== requesterId) {
      throw new ForbiddenException('无权为此订单生成纪要');
    }

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
    if (evidences.length === 0) {
      await this.prisma.order.update({ where: { id: orderId }, data: { status: 'EVIDENCE_COLLECTING' } });
      throw new HttpException('当前服务记录不足，暂不能生成正式陪诊纪要', HttpStatus.BAD_REQUEST);
    }

    const evidenceSummary = evidences
      .map(e => `[${e.nodeName}] 形式：${e.type}，内容：${e.content || '无详细转写'}`)
      .join('\n');
      
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

      if (!response.ok) throw new Error(`MiniMax HTTP ${response.status}`);
      const data = await response.json();
      if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
        const msg = data.choices[0].message;
        // 如果推理模型返回了思考过程，可以选做日志记录，这里直接提取最终的正文
        generatedContent = msg.content;
      } else throw new Error('MiniMax 返回内容为空');
    } catch (err) {
      this.logger.error('Failed to communicate with MiniMax API', err);
      await this.prisma.order.update({ where: { id: orderId }, data: { status: 'EVIDENCE_COLLECTING' } });
      throw new HttpException('纪要生成失败，请重试或改为人工补充', HttpStatus.BAD_GATEWAY);
    }

    // 5. 产生并保存康复备忘录
    const memo = await this.prisma.recoveryMemo.create({
      data: {
        orderId,
        content: generatedContent,
        aiModel: 'MiniMax-M2.7',
        status: 'generated'
      }
    });

    return memo;
  }
}
