#!/usr/bin/env node

/**
 * Script de teste para verificar se a API do Gemini está funcionando
 * Testa a geração de imagem usando o modelo gemini-3-pro-image-preview
 * 
 * Uso: node scripts/test-gemini-image.js
 */

require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;
const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";

if (!apiKey) {
  console.error('❌ Erro: GEMINI_API_KEY não configurada no .env.local');
  process.exit(1);
}

console.log('🔍 Testando API do Gemini para geração de imagem...');
console.log(`📦 Modelo: ${imageModel}`);
console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}\n`);

async function testGeminiImage() {
  try {
    const prompt = "Crie uma imagem de um cachorro fofo e feliz, estilo cartoon, cores vibrantes, fundo simples";
    
    console.log('📝 Prompt:', prompt);
    console.log('🚀 Enviando requisição para a API do Gemini...\n');

    const startTime = Date.now();
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.85,
            topP: 0.95,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    const duration = Date.now() - startTime;

    console.log(`⏱️  Tempo de resposta: ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na resposta:');
      console.error(errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.error('\n📋 Erro detalhado:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        // Não é JSON, já mostramos o texto
      }
      
      return;
    }

    const data = await response.json();
    
    console.log('✅ Resposta recebida com sucesso!\n');
    
    // Verificar se há imagem na resposta
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      
      if (candidate.content && candidate.content.parts) {
        const imagePart = candidate.content.parts.find(part => part.inlineData);
        
        if (imagePart && imagePart.inlineData) {
          const imageData = imagePart.inlineData.data;
          const mimeType = imagePart.inlineData.mimeType;
          
          console.log('🖼️  Imagem gerada com sucesso!');
          console.log(`📏 Tipo: ${mimeType}`);
          console.log(`📦 Tamanho (base64): ${imageData.length} caracteres`);
          console.log(`💾 Tamanho aproximado: ${Math.round(imageData.length * 0.75 / 1024)} KB\n`);
          
          // Salvar a imagem em um arquivo para verificação
          const fs = require('fs');
          const path = require('path');
          const buffer = Buffer.from(imageData, 'base64');
          const outputPath = path.join(__dirname, 'test-image-output.png');
          
          fs.writeFileSync(outputPath, buffer);
          console.log(`💾 Imagem salva em: ${outputPath}`);
          console.log('✅ Teste concluído com sucesso!');
        } else {
          console.log('⚠️  Resposta não contém imagem inline');
          console.log('📋 Estrutura da resposta:', JSON.stringify(data, null, 2).substring(0, 500));
        }
      } else {
        console.log('⚠️  Resposta não contém parts');
        console.log('📋 Estrutura da resposta:', JSON.stringify(data, null, 2).substring(0, 500));
      }
    } else {
      console.log('⚠️  Resposta não contém candidates');
      console.log('📋 Estrutura completa da resposta:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Erro ao testar API:');
    
    if (error.name === 'AbortError') {
      console.error('⏱️  Timeout: A requisição demorou mais de 30 segundos');
    } else if (error instanceof Error) {
      console.error(`📛 Nome: ${error.name}`);
      console.error(`💬 Mensagem: ${error.message}`);
      if (error.stack) {
        console.error(`📚 Stack: ${error.stack.substring(0, 500)}`);
      }
    } else {
      console.error('Erro desconhecido:', error);
    }
  }
}

testGeminiImage()
  .then(() => {
    console.log('\n✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });









