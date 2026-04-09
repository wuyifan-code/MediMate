import { NestFactory } from '@nestjs/core';
import { AiModule } from './src/modules/ai/ai.module';
import { MiniMaxProvider } from './src/modules/ai/providers/minimax.provider';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AiModule
  ]
})
class TestModule {}

async function testProvider() {
  const app = await NestFactory.createApplicationContext(TestModule);
  const provider = app.get(MiniMaxProvider);
  
  console.log('Testing Provider directly...');
  const response = await provider.chat([{ role: 'user', content: 'Say hello' }]);
  console.log('Provider Response:', response);
  
  await app.close();
}

testProvider().catch(console.error);
